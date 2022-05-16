/*
   Creates the Token Implicit Grant OAuth Client
*/
module "implicit_oauth" {
  source = "./modules/oauth_client"
}

/*
   Creates the queues used within the flow
*/
//WOOT! WOOT! Nice use of the remote module
module "classifier_queues" {
  source                   = "git::https://github.com/GenesysCloudDevOps/genesys-cloud-queues-demo.git?ref=main"
  classifier_queue_names   = ["web-messaging-queue"]
  classifier_queue_members = [var.userId]
}

//See my comments below about using data like this
 
data "genesyscloud_routing_queue" "Queues" {
  depends_on = [
    module.classifier_queues
  ]
  name = "web-messaging-queue"
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
   Looks up the id of the flow so we can associate it with a widget
*/
data "genesyscloud_flow" "webMsgFlow" {
  depends_on = [
    null_resource.deploy_archy_flow_chat
  ]
  name = "web-messaging-translation-flow"
}

//TODO
//See my comments a couple of rows down about using data to lookup values.  Its unnecessary
//what you are doing.
data "genesyscloud_webdeployments_configuration" "webMsgConfiguration" {
  depends_on = [
    module.web_config
  ]
  name = "${var.environment}-${var.prefix}-configuration"
}

/*   
   Configures the web deployment
*/
module "web_deploy" {
  source      = "./modules/webdeployments_deployment"
  environment = var.environment
  prefix      = var.prefix
  flowId      = data.genesyscloud_flow.webMsgFlow.id 
  //TODO ^^^^ If you use the flow component you can reference the flow directly off the created obkect instead
  //of looking it up after the fact.
  configId    = data.genesyscloud_webdeployments_configuration.webMsgConfiguration.id
  configVer   = data.genesyscloud_webdeployments_configuration.webMsgConfiguration.version
}

/*   
   Configures the interaction widget integration
*/
module "group" {
  source = "./modules/group"
  userId = var.userId
}

//TODO
//You dont need to do this.  Export the id of the group you created with your module.  Then you can 
//reference directly from the module object.
//Take a look here to see how to define an output: https://github.com/GenesysCloudBlueprints/email-aws-comprehend-blueprint/blob/main/components/genesys-email-flow/modules/users/output.tf
//Take a look here to see how it consumed: https://github.com/GenesysCloudBlueprints/email-aws-comprehend-blueprint/blob/main/components/genesys-email-flow/dev/main.tf#L24
//This is a cleaner way to do it.  Output variables allow you to "publish" things from your modules without
//having to do the extra lookiup.
data "genesyscloud_group" "group" {
  depends_on = [
    module.group
  ]
  name = "Web Messaging Group"
}

/*   
   Configures the interaction widget integration
*/
module "interaction_widget" {
  source  = "./modules/integration"
  queueId = data.genesyscloud_routing_queue.Queues.id
  groupId = data.genesyscloud_group.group.id
}