from app.security import hash_invitation_token

def test_invitation_tokens_are_hashed():
    raw = "a-long-random-invitation-token"
    digest = hash_invitation_token(raw)
    assert digest != raw
    assert len(digest) == 64

def test_invitation_token_hash_is_deterministic():
    token = "one-time-token"
    assert hash_invitation_token(token) == hash_invitation_token(token)

def test_different_invitation_tokens_have_different_hashes():
    assert hash_invitation_token("token-a") != hash_invitation_token("token-b")
