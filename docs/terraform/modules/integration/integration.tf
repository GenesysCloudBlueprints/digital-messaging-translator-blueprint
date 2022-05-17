/*
  Creates the interaction widget inntegration
*/
resource "genesyscloud_integration" "integration" {
  intended_state   = "ENABLED"
  integration_type = "embedded-client-app-interaction-widget"
  config {
    name = "Messaging Translator"
    properties = jsonencode({
        "sandbox": "allow-scripts,allow-same-origin,allow-forms,allow-modals",
        "groups": [var.groupId],
        "communicationTypeFilter": "chat, webmessaging",
        "queueIdFilterList": [var.queueId],
        "url": "https://localhost/?conversationid={{pcConversationId}}&language={{pcLangTag}}",
        "permissions": null
    })
    advanced = jsonencode({
        "lifecycle": {
        "ephemeral": false,
        "hooks": {
            "blur": true,
            "focus": true,
            "bootstrap": true,
            "stop": true
        }
        },
        "icon": {
        "48x48": "https://raw.githubusercontent.com/GenesysCloudBlueprints/digital-messaging-translator-blueprint/main/blueprint/images/verbal-48x48.png",
        "96x96": "https://raw.githubusercontent.com/GenesysCloudBlueprints/digital-messaging-translator-blueprint/main/blueprint/images/verbal-96x96.png",
        "128x128": "https://raw.githubusercontent.com/GenesysCloudBlueprints/digital-messaging-translator-blueprint/main/blueprint/images/verbal-128x128.png",
        "256x256": "https://raw.githubusercontent.com/GenesysCloudBlueprints/digital-messaging-translator-blueprint/main/blueprint/images/verbal-256x256.png"
        },
        "monochromicIcon": {
        "vector": "https://raw.githubusercontent.com/GenesysCloudBlueprints/digital-messaging-translator-blueprint/main/blueprint/images/verbal.svg"
        }
    })
  }
}