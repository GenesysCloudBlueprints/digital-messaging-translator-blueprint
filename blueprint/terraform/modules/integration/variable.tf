
variable "queueId" {
  type        = string
  description = "Limit the display of this Interaction Widget to the selected queues."
}

variable "groupId" {
  type        = string
  description = "List of Groups whose members can see this application. Hidden if no group is selected."
}