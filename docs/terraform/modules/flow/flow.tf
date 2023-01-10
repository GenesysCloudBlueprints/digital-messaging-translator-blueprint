resource "genesyscloud_flow" "flow" {
  filepath = "${path.module}/InboundMessageFlow.yaml"
  file_content_hash = filesha256("${path.module}/InboundMessageFlow.yaml")
  substitutions = {
    flow_name           = "web-messaging-translation-flow"
    default_language    = "en-us"
    greeting            = "Hi! How may I help you?"
    queue_name          = "web-messaging-queue"
  }
}