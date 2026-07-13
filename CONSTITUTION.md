# SchedNest Constitution

Version 1.0

## Mission

SchedNest exists to eliminate the cognitive burden of scheduling by
building the world's most intelligent scheduling platform.

## Vision

One intelligent platform that coordinates school, healthcare, work, and
life through a shared AI called Birdy.

## Core Principles

-   One Intelligence
-   One Calendar
-   One Memory
-   Human First
-   Privacy by Design

## Engineering Principles

-   Build once, reuse everywhere.
-   Platform before products.
-   Security before convenience.
-   Accessibility is required.
-   Explain AI recommendations.
-   Keep humans in control.

## Definition of Success

People stop thinking about scheduling because SchedNest quietly keeps
life organized.

---

## Shared Platform Principle

SchedNest is one platform composed of multiple products.

Every capability must be evaluated before implementation.

If a capability benefits more than one product, it belongs in the shared Platform layer.

If a capability benefits only a single product, it belongs within that product.

Products should never duplicate platform functionality. They consume platform services through shared APIs and libraries.

The Platform is responsible for:

- Authentication
- Permissions
- Notifications
- Activity
- Birdy
- Coordination
- Files
- Connectors
- Settings
- AI infrastructure

Products are responsible for their own user experience and domain-specific workflows.

---

## Birdy Principle

Birdy is not a chatbot.

Birdy exists to observe, predict, recommend, coordinate, and automate platform operations.

Birdy should minimize manual work while leaving final authority to the user unless explicit automation has been authorized.

Birdy only uses information from products, services, memories, and data sources the current user has access to and has granted permission to use.

If data is unavailable because a product is not enabled, a service is not connected, or permission has not been granted, Birdy ignores that source rather than making assumptions or mentioning unused products unnecessarily.

Birdy should handle the operational muscle in the background and surface only meaningful suggestions, approvals, risks, and exceptions.

---

## Founder Operating System

Founder OS is the primary internal interface used to operate SchedNest.

Founder OS aggregates platform intelligence but does not replace individual product interfaces.

Founder OS exists to:

- Surface priorities
- Summarize meaningful changes since the last review
- Coordinate operations
- Highlight risks
- Recommend actions
- Monitor platform health
- Manage support
- Reduce repetitive administrative work
- Prevent duplicate work on previously reviewed issues

Founder OS should show only new, materially changed, unresolved, or newly escalated items by default.

A previously reviewed issue should not be surfaced again unless its status, severity, impact, or required action materially changes.

Founder OS should help a small team operate a large platform by ensuring humans manage decisions rather than repetitive operational tasks.

