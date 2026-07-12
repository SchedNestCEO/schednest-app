# Universal Notifications Architecture

## Goal

One notification engine for Student, Teams, Med, Business, and Life.

## Channels

- in-app
- email
- SMS
- push
- future voice

## Core Concepts

- Notification
- Preference
- Delivery
- Escalation
- Template

## Example

```text
Medication reminder due
→ create notification
→ check preferences
→ respect quiet hours
→ deliver SMS
→ wait for acknowledgement
→ escalate to approved caregiver if configured
→ record activity and delivery result
```

## Planned Tables

- platform_notifications
- platform_notification_deliveries
- platform_notification_preferences
- platform_notification_templates
- platform_escalation_rules
