resource "genesyscloud_oauth_client" "implicit-client" {
  name                          = "Web Messages Implicit Client"
  description                   = "For web messaging"
  access_token_validity_seconds = 600
  registered_redirect_uris      = ["https://localhost/"]
  authorized_grant_type         = "TOKEN"
  scopes                        = ["conversations", "conversations:readonly", "notifications", "response-management", "response-management:readonly", "user-basic-info", "users:readonly"]
  state                         = "active"
}