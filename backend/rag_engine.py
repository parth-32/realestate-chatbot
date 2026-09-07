"""
Hybrid RAG Engine for Real Estate Discovery.
Uses BM25 lexical ranking + metadata filtering + structured prompt orchestration.
"""

import json
import os
import re
from typing import List, Dict, Any, Optional
from rank_bm25 import BM25Okapi

class RAGEngine:
    def __init__(self, data_path: Optional[str] = None):
        if not data_path:
            data_path = os.path.join(os.path.dirname(__file__), "data", "properties.json")
        self.data_path = data_path
        self.properties: List[Dict[str, Any]] = []
        self.bm25: Optional[BM25Okapi] = None
        self.corpus_tokens: List[List[str]] = []
        self.load_data()

    def tokenize(self, text: str) -> List[str]:
        cleaned = re.sub(r'[^a-zA-Z0-9\u0600-\u06FF\s]', ' ', text.lower())
        return [w for w in cleaned.split() if len(w) > 1]

    def load_data(self):
        if os.path.exists(self.data_path):
            with open(self.data_path, "r", encoding="utf-8") as f:
                self.properties = json.load(f)
            
            self.corpus_tokens = [self.tokenize(p.get("search_text", "")) for p in self.properties]
            if self.corpus_tokens:
                self.bm25 = BM25Okapi(self.corpus_tokens)
            print(f"[RAG] Indexed {len(self.properties)} properties into BM25 engine.")
        else:
            print(f"[RAG] Warning: data file not found at {self.data_path}")

    def filter_properties(
        self,
        source: Optional[str] = None,
        city: Optional[str] = None,
        property_type: Optional[str] = None,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None,
        min_beds: Optional[int] = None,
        luxury_brand: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        results = self.properties
        if source:
            results = [p for p in results if p.get("source", "").lower() == source.lower()]
        if city:
            results = [p for p in results if city.lower() in p.get("city", "").lower() or city.lower() in p.get("country", "").lower()]
        if property_type:
            results = [p for p in results if property_type.lower() in p.get("property_type", "").lower()]
        if min_price is not None:
            results = [p for p in results if p.get("price_sar", 0) >= min_price]
        if max_price is not None:
            results = [p for p in results if p.get("price_sar", 0) <= max_price]
        if min_beds is not None:
            results = [p for p in results if p.get("bedrooms", 0) >= min_beds]
        if luxury_brand:
            results = [p for p in results if luxury_brand.lower() in p.get("luxury_brand", "").lower()]
        return results

    def retrieve(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """Hybrid search combining intent heuristic parsing and BM25 ranking."""
        if not self.properties or not self.bm25:
            return []

        query_lower = query.lower()
        
        # Heuristic intent extraction for explicit filters
        source_filter = None
        if "darglobal" in query_lower or "dar global" in query_lower:
            source_filter = "DarGlobal"
        elif "wasalt" in query_lower:
            source_filter = "Wasalt"

        # City extraction
        city_filter = None
        cities = ["dubai", "riyadh", "jeddah", "muscat", "oman", "qatar", "doha", "spain", "marbella", "london", "khobar", "dammam"]
        for c in cities:
            if c in query_lower:
                city_filter = c
                break

        # Property type extraction
        p_type = None
        if "villa" in query_lower:
            p_type = "Villa"
        elif "penthouse" in query_lower or "sky villa" in query_lower:
            p_type = "Penthouse"
        elif "apartment" in query_lower or "flat" in query_lower:
            p_type = "Apartment"
        elif "mansion" in query_lower:
            p_type = "Mansion"

        tokens = self.tokenize(query)
        if not tokens:
            return self.properties[:top_k]

        scores = self.bm25.get_scores(tokens)
        
        # Rank candidate indices
        ranked_indices = sorted(range(len(scores)), key=lambda i: scores[i], reverse=True)
        
        candidates = []
        for idx in ranked_indices:
            p = self.properties[idx]
            
            # Boost score if matching explicit filters
            score_boost = 0
            if source_filter and p.get("source", "").lower() == source_filter.lower():
                score_boost += 5.0
            if city_filter and (city_filter in p.get("city", "").lower() or city_filter in p.get("country", "").lower()):
                score_boost += 6.0
            if p_type and p_type.lower() in p.get("property_type", "").lower():
                score_boost += 3.0
            
            # Brand boosts
            for brand in ["pagani", "lamborghini", "aston martin", "trump", "missoni", "elie saab", "fendi", "mouawad"]:
                if brand in query_lower and brand in p.get("luxury_brand", "").lower():
                    score_boost += 10.0

            total_score = scores[idx] + score_boost
            candidates.append((p, total_score))

        candidates.sort(key=lambda x: x[1], reverse=True)
        return [c[0] for c in candidates[:top_k]]

    def build_system_prompt(self, relevant_properties: List[Dict[str, Any]]) -> str:
        """Constructs rich RAG system prompt with luxury persona and property context."""
        context_blocks = []
        for idx, p in enumerate(relevant_properties, 1):
            block = (
                f"[{idx}] {p['title']} (ID: {p['id']})\n"
                f"• Source: {p['source']} | Developer: {p['developer']}\n"
                f"• Brand: {p['luxury_brand']}\n"
                f"• Location: {p['district']}, {p['city']}, {p['country']}\n"
                f"• Price: {p['price_formatted']} ({p['price_sar']:,} SAR)\n"
                f"• Specs: {p['bedrooms']} Beds | {p['bathrooms']} Baths | {p['area_sqm']} SQM ({p['area_sqft']} SQFT)\n"
                f"• Key Features: {', '.join(p['features'])}\n"
                f"• Completion / Status: {p['completion']}\n"
                f"• Official Link: {p['url']}\n"
                f"• Summary: {p['description']}"
            )
            context_blocks.append(block)

        properties_context = "\n\n".join(context_blocks)

        prompt = f"""You are "Aura", the elite Luxury Real Estate & Investment Concierge representing properties from DarGlobal (international branded developments) and Wasalt (premier Saudi Arabian real estate marketplace).

ROLE & ATTITUDE:
- Professional, sophisticated, knowledgeable, and polite.
- Expert on luxury branded residences (Pagani, Lamborghini, Aston Martin, Elie Saab, Missoni, Trump International) as well as prime Saudi real estate across Riyadh, Jeddah, and Al Khobar.
- Transparent and accurate: Only recommend properties present in the verified context below. Quote exact prices in SAR and USD when answering.
- Multilingual: If the user speaks Arabic, reply in refined, professional Arabic (العربية). If in English, reply in polished English.
- Always highlight lifestyle perks, investment metrics (ROI, Golden Visa eligibility, rental yield, payment flexibility), and provide official listing links.
- Format responses cleanly with bold headings, bullet points, and mention the property ID when discussing specific projects.

AVAILABLE VERIFIED PROPERTIES FOR CURRENT QUERY:
{properties_context}

INSTRUCTIONS:
1. Provide a comprehensive, tailored response addressing the client's request directly.
2. Compare options when multiple properties match (e.g. price vs location vs lifestyle amenities).
3. If the user asks about investments or mortgages, provide realistic figures and mention down payments or ROI potential.
4. End with a courteous offer to schedule a VIP viewing, share the official brochure, or calculate custom payment plans.
"""
        return prompt

    def generate_fallback_response(self, query: str, relevant_properties: List[Dict[str, Any]]) -> str:
        """Deterministic high-quality fallback RAG response when OpenRouter rate limit is active."""
        if not relevant_properties:
            return (
                "Thank you for reaching out to the DarGlobal & Wasalt Real Estate Concierge. "
                "I couldn't find an exact match for your specific criteria in our current portfolio. "
                "You can explore our full collection of branded residences in Dubai, Oman, Spain, and London, "
                "or verified prime villas and apartments across Riyadh and Jeddah in the Property Explorer tab."
            )

        top_p = relevant_properties[0]
        is_arabic = any('\u0600' <= char <= '\u06FF' for char in query)

        if is_arabic:
            response = f"أهلاً بك في خدمة المساعد العقاري الفاخر لـ **دار جلوبال (DarGlobal)** و **وصلت (Wasalt)**.\n\n"
            response += f"بناءً على طلبك، يسعدني أن أرشح لك أهم العقارات المتاحة التي تلبي تطلعاتك الاستثمارية والسكنية:\n\n"
            for p in relevant_properties[:3]:
                response += f"### 🏛️ **{p['title']}**\n"
                response += f"- **الموقع**: {p['city']}, {p['country']} ({p['district']})\n"
                response += f"- **السعر**: {p['price_formatted']}\n"
                response += f"- **المواصفات**: {p['bedrooms']} غرف نوم | {p['area_sqm']} م²\n"
                response += f"- **العلامة / المطور**: {p['luxury_brand']} ({p['source']})\n"
                response += f"- **المميزات**: {', '.join(p['features'][:3])}\n"
                response += f"- [عرض تفاصيل المشروع الرسمية]({p['url']})\n\n"
            response += "هل ترغب في مقارنة إضافية أو حساب خطة سداد ميسرة وعوائد الإيجار المتوقعة؟"
            return response

        # English Response
        response = f"Welcome to the **DarGlobal & Wasalt Luxury Real Estate Concierge**. Based on your interest, here are the finest curated developments matching your requirements:\n\n"
        for p in relevant_properties[:3]:
            response += f"### 💎 **{p['title']}**\n"
            response += f"- **Developer / Source**: {p['source']} ({p['developer']})\n"
            response += f"- **Branded Partnership**: {p['luxury_brand']}\n"
            response += f"- **Location**: {p['district']}, {p['city']}, {p['country']}\n"
            response += f"- **Price**: **{p['price_formatted']}**\n"
            response += f"- **Specifications**: {p['bedrooms']} Bedrooms • {p['bathrooms']} Bathrooms • {p['area_sqm']} SQM ({p['area_sqft']:,} SQFT)\n"
            response += f"- **Highlights**: {', '.join(p['features'][:4])}\n"
            response += f"- **Overview**: {p['description']}\n"
            response += f"- 🔗 **Official Portal**: [View Project & Floorplans]({p['url']})\n\n"

        response += "---\n"
        response += "**Investment & Advisory Note**:\n"
        if any(p.get("country") == "United Arab Emirates" for p in relevant_properties):
            response += "• Properties in the UAE priced above 2M AED / SAR qualify for the prestigious **UAE 10-Year Golden Visa**.\n"
        if any(p.get("country") == "Saudi Arabia" for p in relevant_properties):
            response += "• Saudi properties in Riyadh & Jeddah offer robust capital appreciation driven by Vision 2030 and high rental yields (6-9%).\n"
        response += "\nWould you like me to calculate estimated mortgage installments, provide rental yield projections, or arrange a private consultation?"
        return response

if __name__ == "__main__":
    engine = RAGEngine()
    results = engine.retrieve("Pagani Dubai penthouse")
    print("Found:", len(results))
    for r in results:
        print(r["title"], r["price_formatted"])
