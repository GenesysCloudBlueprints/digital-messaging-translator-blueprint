resource "null_resource" "deploy_archy_flow_chat" {
  depends_on = [
    module.classifier_queues
  ]
//TODO
//The flow component is now GA.  (Just went week before last).  I would use the flow component instead
//of the Archy CLI. There is an example of this in the blueprint: https://github.com/GenesysCloudBlueprints/sms-followup-on-missed-callback-blueprint
  provisioner "local-exec" {
    command = "  archy publish --forceUnlock --file architect-flows/WebMessagingTranslation_v3-0.yaml --clientId $GENESYSCLOUD_OAUTHCLIENT_ID --clientSecret $GENESYSCLOUD_OAUTHCLIENT_SECRET --location $GENESYSCLOUD_ARCHY_REGION  --overwriteResultsFile --resultsFile results.json "
  }
}


