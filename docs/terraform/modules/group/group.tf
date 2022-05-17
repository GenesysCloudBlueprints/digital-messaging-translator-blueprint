/*
  Creates the group
*/
resource "genesyscloud_group" "group" {
  name          = "Web Messaging Group"
  description   = "Group for Web Messaging"
  type          = "official"
  visibility    = "public"
  rules_visible = true
  owner_ids     = [var.userId]
  member_ids    = [var.userId]
}