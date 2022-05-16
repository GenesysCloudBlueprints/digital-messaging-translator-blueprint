#Prod
environment            = "dev"
prefix                 = "web-messaging"
userId                 = "6ade8ef8-bbc5-4f05-9ad5-31be015fda25"
//TODO
// I try to avoid a guid.  I know why you are doing it, but instead provide the email address of the user
// and then look up the user's id by using the user data resource.  Its cleaner and keeps GUIIDs out of the
// code.