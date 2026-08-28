import os
import sys
import asyncio
from typing import List, Dict, Any

# Ensure UTF-8 output on Windows consoles
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.database import connect_to_mongo, close_mongo_connection, is_mongo_active
from app.services.rag_service import process_rag_query
from seed_data import seed_database

# 10 Evaluation Categories from Section 40 + Out-of-Scope Guardrail Test
EVALUATION_DATASET = [
    {
        "category": "Admissions",
        "question": "What are the eligibility criteria and required cutoff for B.Tech admission?",
        "expected_source": "student_handbook_and_campus_services.txt",
        "should_be_grounded": True
    },
    {
        "category": "Fees",
        "question": "What is the annual tuition fee for B.Tech Computer Science and Engineering?",
        "expected_source": "fee_structure_and_scholarships.txt",
        "should_be_grounded": True
    },
    {
        "category": "Courses",
        "question": "What courses are offered in Semester 4 for CSE students?",
        "expected_source": "cse_course_catalog.txt",
        "should_be_grounded": True
    },
    {
        "category": "Exams",
        "question": "What is the semester examination fee and revaluation fee?",
        "expected_source": "fee_structure_and_scholarships.txt",
        "should_be_grounded": True
    },
    {
        "category": "Hostel",
        "question": "What are the hostel gate curfew in-timings for boys and girls hostels?",
        "expected_source": "hostel_guidelines.txt",
        "should_be_grounded": True
    },
    {
        "category": "Library",
        "question": "What are the Central Library timings and book borrowing limits for undergraduates?",
        "expected_source": "student_handbook_and_campus_services.txt",
        "should_be_grounded": True
    },
    {
        "category": "Scholarships",
        "question": "What scholarships are available for students with high marks or SGPA?",
        "expected_source": "fee_structure_and_scholarships.txt",
        "should_be_grounded": True
    },
    {
        "category": "Placements",
        "question": "What is the placement eligibility criteria and average package for CSE?",
        "expected_source": "student_handbook_and_campus_services.txt",
        "should_be_grounded": True
    },
    {
        "category": "Policies",
        "question": "What is the minimum attendance requirement to take semester examinations?",
        "expected_source": "cse_course_catalog.txt",
        "should_be_grounded": True
    },
    {
        "category": "Academic Calendar",
        "question": "When do the autumn semester classes commence and when are the mid-term exams?",
        "expected_source": "academic_calendar_2026.txt",
        "should_be_grounded": True
    },
    # Out of Scope Guardrail Test (Section 39)
    {
        "category": "Out-of-Scope (Guardrail)",
        "question": "What is the secret recipe for cafeteria chocolate chip cookies?",
        "expected_source": None,
        "should_be_grounded": False
    }
]


async def run_rag_evaluation():
    print("\n" + "=" * 80)
    print("RUNNING RAG QUALITY EVALUATION SUITE (Section 40)")
    print("=" * 80)

    await seed_database()
    await connect_to_mongo()

    passed_tests = 0
    total_tests = len(EVALUATION_DATASET)

    print(f"\nEvaluating {total_tests} test cases across 10 college domains & guardrails...\n")

    for idx, test in enumerate(EVALUATION_DATASET, 1):
        cat = test["category"]
        q = test["question"]
        expected_src = test["expected_source"]
        should_ground = test["should_be_grounded"]

        print(f"[{idx}/{total_tests}] Testing Category: {cat}")
        print(f"  Question: \"{q}\"")

        res = await process_rag_query(question=q)

        # Check grounding condition
        grounded_match = (res.grounded == should_ground)
        
        # Check source match if expected
        source_names = [s.document_name for s in res.sources]
        source_match = True
        if expected_src:
            source_match = any(expected_src in s_name for s_name in source_names)

        is_passed = grounded_match and (source_match if should_ground else True)
        if is_passed:
            passed_tests += 1
            status_tag = "[PASS]"
        else:
            status_tag = "[FAIL]"

        print(f"  Result: {status_tag}")
        print(f"  Confidence: {res.confidence} | Grounded: {res.grounded}")
        print(f"  Answer: {res.answer[:120]}...")
        if res.sources:
            print(f"  Sources: {', '.join([f'{s.document_name} (p.{s.page_number})' for s in res.sources])}")
        print("-" * 80)

    pass_rate = (passed_tests / total_tests) * 100
    print("\n" + "=" * 80)
    print(f"EVALUATION SUMMARY: {passed_tests}/{total_tests} Tests Passed ({pass_rate:.1f}%)")
    print("=" * 80 + "\n")

    await close_mongo_connection()
    return passed_tests == total_tests


if __name__ == "__main__":
    success = asyncio.run(run_rag_evaluation())
    if not success:
        sys.exit(1)
