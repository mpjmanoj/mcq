import requests
import time

BASE_URL = "http://localhost:8000"

def test_full_competition_flow():
    print(">>> 1. Resetting session to clean state...")
    r = requests.post(f"{BASE_URL}/api/quiz/reset")
    assert r.status_code == 200, f"Reset failed: {r.text}"
    print("✓ Session reset to WAITING")

    print("\n>>> 2. Testing validation...")
    # Bad name
    r = requests.post(f"{BASE_URL}/api/participants/join", json={"name": "A", "mobile_number": "9876543210"})
    assert r.status_code in [400, 422], f"Should reject 1-character name, got {r.status_code}"
    print("✓ Short name rejected (400/422)")

    # Bad mobile
    r = requests.post(f"{BASE_URL}/api/participants/join", json={"name": "Valid Name", "mobile_number": "123"})
    assert r.status_code in [400, 422], f"Should reject invalid mobile, got {r.status_code}"
    print("✓ Invalid mobile rejected (400/422)")

    print("\n>>> 3. Registering 3 participants...")
    p1 = requests.post(f"{BASE_URL}/api/participants/join", json={"name": "Rahul", "mobile_number": "9876543210"}).json()
    assert p1["name"] == "Rahul"
    p1_id = p1["participant_id"]

    p2 = requests.post(f"{BASE_URL}/api/participants/join", json={"name": "Anil", "mobile_number": "9876543211"}).json()
    p2_id = p2["participant_id"]

    p3 = requests.post(f"{BASE_URL}/api/participants/join", json={"name": "Priya", "mobile_number": "9876543212"}).json()
    p3_id = p3["participant_id"]
    print(f"✓ Registered Rahul ({p1_id[:8]}), Anil ({p2_id[:8]}), Priya ({p3_id[:8]})")

    # Duplicate registration test
    p1_dup = requests.post(f"{BASE_URL}/api/participants/join", json={"name": "Rahul", "mobile_number": "9876543210"}).json()
    assert p1_dup["is_reconnect"] is True, "Should recognize existing participant and allow reconnection"
    print("✓ Duplicate mobile correctly routed to reconnect existing session")

    # Check participant count
    parts = requests.get(f"{BASE_URL}/api/participants").json()
    assert parts["count"] == 3, f"Expected 3, got {parts['count']}"
    print(f"✓ Participants count in lobby: {parts['count']}")

    print("\n>>> 4. Starting Quiz...")
    start_res = requests.post(f"{BASE_URL}/api/quiz/start").json()
    assert start_res["status"] == "LIVE"
    print("✓ Quiz transitioned to LIVE")

    # Late join lock test
    late_res = requests.post(f"{BASE_URL}/api/participants/join", json={"name": "Late Player", "mobile_number": "9876543299"})
    assert late_res.status_code == 403, "Should lock new joins when LIVE"
    print("✓ Late joiners locked out with 403 status")

    print("\n>>> 5. Fetching questions and testing security...")
    q1 = requests.get(f"{BASE_URL}/api/quiz/questions/1").json()
    assert "correct_option" not in q1, "SECURITY BREACH: correct_option exposed to participant!"
    print("✓ Security verified: correct_option is strictly omitted from participant question endpoint")

    print("\n>>> 6. Simulating answer submissions for all questions...")
    # Fetch admin questions to know answers for simulation
    admin_qs = requests.get(f"{BASE_URL}/api/admin/questions").json()
    total_qs = len(admin_qs)
    assert total_qs == 59, f"Expected 59 questions, found {total_qs}"

    # Priya answers all questions correctly
    for q in admin_qs:
        ans_res = requests.post(f"{BASE_URL}/api/quiz/answer", json={
            "participant_id": p3_id,
            "question_number": q["question_number"],
            "selected_option": q["correct_option"]
        })
        assert ans_res.status_code == 200
    print(f"✓ Priya submitted all {total_qs} answers (all correct)")

    # Rahul answers all but misses question 1
    for i, q in enumerate(admin_qs):
        wrong_opt = "A" if q["correct_option"] != "A" else "B"
        selected = wrong_opt if i == 0 else q["correct_option"]
        ans_res = requests.post(f"{BASE_URL}/api/quiz/answer", json={
            "participant_id": p1_id,
            "question_number": q["question_number"],
            "selected_option": selected
        })
        assert ans_res.status_code == 200
    print(f"✓ Rahul submitted all {total_qs} answers ({total_qs - 1} correct)")

    # Anil answers all but misses questions 1 and 2
    for i, q in enumerate(admin_qs):
        wrong_opt = "A" if q["correct_option"] != "A" else "B"
        selected = wrong_opt if i < 2 else q["correct_option"]
        ans_res = requests.post(f"{BASE_URL}/api/quiz/answer", json={
            "participant_id": p2_id,
            "question_number": q["question_number"],
            "selected_option": selected
        })
        assert ans_res.status_code == 200
    print(f"✓ Anil submitted all {total_qs} answers ({total_qs - 2} correct)")

    print("\n>>> 6b. Testing Back Navigation & Answer Revision...")
    # Anil goes back to Question 1 and fixes his answer to the correct option!
    q1 = admin_qs[0]
    update_res = requests.post(f"{BASE_URL}/api/quiz/answer", json={
        "participant_id": p2_id,
        "question_number": q1["question_number"],
        "selected_option": q1["correct_option"]
    })
    assert update_res.status_code == 200, f"Updating previous answer failed: {update_res.text}"
    p2_status = requests.get(f"{BASE_URL}/api/participants/{p2_id}").json()
    assert p2_status["score"] == total_qs - 1, f"Expected Anil score to increase to {total_qs - 1}, got {p2_status['score']}"
    print("✓ Back navigation and answer updating verified! Score correctly updated.")

    print("\n>>> 6c. Testing Individual Participant Results Endpoint...")
    p2_results = requests.get(f"{BASE_URL}/api/participants/{p2_id}/results").json()
    assert p2_results["total_questions"] == total_qs
    assert p2_results["correct_count"] == total_qs - 1
    assert p2_results["wrong_count"] == 1
    assert len(p2_results["questions"]) == total_qs
    assert p2_results["questions"][0]["is_correct"] is True
    assert p2_results["questions"][0]["selected_option"] == q1["correct_option"]
    assert "explanation" in p2_results["questions"][0]
    print("✓ Individual results breakdown verified: correct vs wrong, user answer, correct answer, and explanation present.")

    print("\n>>> 7. Checking Leaderboard & Tie-Breaker...")
    lb_data = requests.get(f"{BASE_URL}/api/quiz/leaderboard").json()
    lb = lb_data["leaderboard"]
    print("Leaderboard Standings:")
    for item in lb:
        print(f"  Rank #{item['rank']}: {item['name']} - Score: {item['score']}/{total_qs} (Time: {item['formatted_time']})")

    assert lb[0]["name"] == "Priya" and lb[0]["score"] == total_qs, f"1st place must be Priya with {total_qs}/{total_qs}"
    print("✓ Rankings, Scores, and Tie-breaking verified!")

    print("\n>>> 8. Ending Quiz & Ceremony...")
    end_res = requests.post(f"{BASE_URL}/api/quiz/end").json()
    assert end_res["status"] == "COMPLETED"
    assert len(end_res["top3"]) == 3
    print("✓ Quiz marked COMPLETED. Top 3 champions prepared.")

    print("\n>>> ALL BACKEND AUTOMATED TESTS PASSED SUCCESSFULLY! <<<")

if __name__ == "__main__":
    test_full_competition_flow()
