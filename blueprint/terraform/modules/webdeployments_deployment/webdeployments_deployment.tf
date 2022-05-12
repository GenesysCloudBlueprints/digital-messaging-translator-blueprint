/*
  Creates the messaging deployment and assigns the flow
*/
resource "genesyscloud_webdeployments_deployment" "myWebMsgDeployment" {
  name                    = "${local.resource_name_prefix}-deployment"
  description             = "Web messaging deployment"
  flow_id                 = var.flowId
  status                  = "Active"
  allow_all_domains       = true
  allowed_domains         = []
  configuration {
    id      = var.configId
    version = var.configVer
  }
}
