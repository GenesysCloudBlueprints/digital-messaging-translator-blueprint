resource "genesyscloud_oauth_client" "code-auth-client" {
  name                          = "Web Messages Code Auth Client"
  description                   = "For web messaging"
  access_token_validity_seconds = 86400
  registered_redirect_uris      = ["https://localhost/oauth/callback"]
  authorized_grant_type         = "CODE"
  scopes                        = ["conversations", "conversations:readonly", "notifications", "response-management", "response-management:readonly", "user-basic-info", "users:readonly"]
  state                         = "active"
}