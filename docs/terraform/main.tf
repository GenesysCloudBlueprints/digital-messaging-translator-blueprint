/*
   Creates the Token Implicit Grant OAuth Client
*/
module "implicit_oauth" {
  source = "./modules/oauth_client"
}

/*
   Looks up the id of the user so we can associate it with the queue and group
*/
data "genesyscloud_user" "user" {
  email = var.email
}

/*
   Creates the queues used within the flow
*/
module "queue" {
  source                   = "git::https://github.com/GenesysCloudDevOps/genesys-cloud-queues-demo.git?ref=main"
  classifier_queue_names   = ["web-messaging-queue"]
  classifier_queue_members = [data.genesyscloud_user.user.id]
}

/*   
   Configures the architect inbound message flow
*/
module "archy_flow" {
  source      = "./modules/flow"
}

/*   
   Configures the web deployment configuration
*/
module "web_config" {
  source      = "./modules/webdeployments_configuration"
  environment = var.environment
  prefix      = var.prefix
}

/*   
   Configures the web deployment
*/
module "web_deploy" {
  source      = "./modules/webdeployments_deployment"
  environment = var.environment
  prefix      = var.prefix
  flowId      = module.archy_flow.flow_id
  configId    = module.web_config.config_id
  configVer   = module.web_config.config_ver
}

/*   
   Configures the interaction widget integration
*/
module "group" {
  source = "./modules/group"
  userId = data.genesyscloud_user.user.id
}

/*   
   Configures the interaction widget integration
*/
module "interaction_widget" {
  source  = "./modules/integration"
  queueId = module.queue.queue_ids["web-messaging-queue"]
  groupId = module.group.group_id
}