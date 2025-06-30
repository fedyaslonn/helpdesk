from core.tasks import (
    send_change_assignee_notification,
    send_remove_assignee_notification,
    send_set_assignee_notification,
)


class TicketNotificationService:
    @staticmethod
    def send_notification(operation, ticket_id, old_assignee_id, new_assignee_id):
        if operation == "change":
            send_change_assignee_notification.delay(
                ticket_id, old_assignee_id, new_assignee_id
            )

        elif operation == "set":
            send_set_assignee_notification.delay(ticket_id, new_assignee_id)

        elif operation == "remove":
            send_remove_assignee_notification.delay(ticket_id, old_assignee_id)
