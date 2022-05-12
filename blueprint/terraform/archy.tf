resource "null_resource" "deploy_archy_flow_chat" {
  depends_on = [
    module.classifier_queues
  ]

  provisioner "local-exec" {
    command = "  archy publish --forceUnlock --file architect-flows/WebMessagingTranslation_v3-0.yaml --clientId $GENESYSCLOUD_OAUTHCLIENT_ID --clientSecret $GENESYSCLOUD_OAUTHCLIENT_SECRET --location $GENESYSCLOUD_ARCHY_REGION  --overwriteResultsFile --resultsFile results.json "
  }
}


