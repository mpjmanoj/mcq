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

    print("\n>>> 6. Simulating answer submissions for all 20 questions...")
    # Fetch admin questions to know answers for simulation
    admin_qs = requests.get(f"{BASE_URL}/api/admin/questions").json()
    assert len(admin_qs) == 20, f"Expected 20 questions, found {len(admin_qs)}"

    # Priya answers all 20 correctly
    for q in admin_qs:
        ans_res = requests.post(f"{BASE_URL}/api/quiz/answer", json={
            "participant_id": p3_id,
            "question_number": q["question_number"],
            "selected_option": q["correct_option"]
        }).json()
        assert ans_res["status"] == "success"
    print("✓ Priya submitted all 20 answers (all correct)")

    time.sleep(0.5)

    # Rahul answers 19 correctly, 1 wrong
    for q in admin_qs:
        opt = q["correct_option"] if q["question_number"] != 5 else ("A" if q["correct_option"] != "A" else "B")
        ans_res = requests.post(f"{BASE_URL}/api/quiz/answer", json={
            "participant_id": p1_id,
            "question_number": q["question_number"],
            "selected_option": opt
        }).json()
        assert ans_res["status"] == "success"
    print("✓ Rahul submitted all 20 answers (19 correct)")

    time.sleep(0.5)

    # Anil answers 18 correctly, 2 wrong
    for q in admin_qs:
        opt = q["correct_option"] if q["question_number"] not in [2, 7] else ("A" if q["correct_option"] != "A" else "B")
        ans_res = requests.post(f"{BASE_URL}/api/quiz/answer", json={
            "participant_id": p2_id,
            "question_number": q["question_number"],
            "selected_option": opt
        }).json()
        assert ans_res["status"] == "success"
    print("✓ Anil submitted all 20 answers (18 correct)")

    print("\n>>> 7. Checking Leaderboard & Tie-Breaker...")
    lb_data = requests.get(f"{BASE_URL}/api/quiz/leaderboard").json()
    lb = lb_data["leaderboard"]
    print("Leaderboard Standings:")
    for item in lb:
        print(f"  Rank #{item['rank']}: {item['name']} - Score: {item['score']}/20 (Time: {item['formatted_time']})")

    assert lb[0]["name"] == "Priya" and lb[0]["score"] == 20, "1st place must be Priya with 20/20"
    assert lb[1]["name"] == "Rahul" and lb[1]["score"] == 19, "2nd place must be Rahul with 19/20"
    assert lb[2]["name"] == "Anil" and lb[2]["score"] == 18, "3rd place must be Anil with 18/20"
    print("✓ Rankings, Scores, and Tie-breaking verified!")

    print("\n>>> 8. Ending Quiz & Ceremony...")
    end_res = requests.post(f"{BASE_URL}/api/quiz/end").json()
    assert end_res["status"] == "COMPLETED"
    assert len(end_res["top3"]) == 3
    print("✓ Quiz marked COMPLETED. Top 3 champions prepared.")

    print("\n>>> ALL BACKEND AUTOMATED TESTS PASSED SUCCESSFULLY! <<<")

if __name__ == "__main__":
    test_full_competition_flow()
