import requests

res = requests.post("https://zoom-clone-9hgc.onrender.com/api/auth/signup", json={
    "name": "Test User",
    "email": "tester@test.com",
    "password": "password123"
})

print("Status:", res.status_code)
print("Response:", res.text)
