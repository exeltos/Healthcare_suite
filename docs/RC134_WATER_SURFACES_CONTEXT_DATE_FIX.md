# rc.134 — Water / Surfaces context + date control fix

- Water and Surfaces collection flows keep the source fixed from route/category context.
- Environmental saves no longer require a duplicate `subjectName` source entry; the route source is used when the field is blank.
- Laboratory date inputs use an explicit `core-date-control` visual contract matching text/select controls.
