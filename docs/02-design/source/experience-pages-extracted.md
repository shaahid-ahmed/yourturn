# Designer source — extracted text

Mechanical extraction, not an edited specification. The PDF remains authoritative, including its diagram.

## PDF page 1

Unspoken: Experience and Pages Spec

Unspoken: Experience and Pages Spec

Nov 12, 2026 · @Janani

At a glance

Unspoken is a $15-a-month mobile app where friend groups, called pods, get an AI planner
that finds plans around NYC, polls the group, books with approval, and splits the bill
through PayPal. This spec covers the experience and every page, so the backend team
knows what to build.

Area Locked decision

Platform Standalone mobile app. NYC only for the demo

Pricing $15 monthly subscription

Pods A pod is a friend group, 3 to 8 people, created from
the phone contact list

Chat Built-in group chat in every pod. The AI planner
lives inside it

Profile Bio, phone number, interests, and private limits, all
editable later

Private limits Budget and similar limits are set in the profile and
never shown to the group

Budget conflicts If no plan fits someone's budget, the planner asks
that person alone, in their private chat, whether a
one-time different budget is okay

Voting Poll votes are visible to the pod

Booking The planner asks for confirmation before booking
and sends reminders until it gets one

Money When members say yes, one person pays and the
others owe them, tracked in PayPal-linked balances

                                                                                                             Page 1 of 18

## PDF page 2

Unspoken: Experience and Pages Spec

Three things from the earlier backend spec no longer hold: holding everyone's share
before charging, hidden votes, and counts-only progress. Section 12 lists what the team
should change.

Core rules

Three rules shape every screen: what members pay to use the app, who can see what, and
how money moves after a plan is chosen.

Subscription

The app costs $15 a month. Whether each member pays or one member covers the pod is
open (section 12). Subscription billing and hangout money are separate: the $15 goes
through the phone's app store billing, and PayPal handles only money between friends and
venues.

Who sees what

Information Who sees it Status

Budget and other private You and the planner. Never a pod, a poll, or a Decided
limits balance

Budget stretch request You alone, in your private chat with the Decided
planner

Poll votes The whole pod, with names Decided

Calendars The planner reads only free or busy time to Recommended
find slots. Members never see each other's
calendars

Pod chat Pod members only Decided

Balances You see what you owe and what you are Open
owed. Whether the pod sees the full ledger
is open

                                                                                                           Page 2 of 18

## PDF page 3

Unspoken: Experience and Pages Spec

How money moves

1.  The pod votes on a plan and a time. Members who want to go say yes. Any number of
    yeses is enough.
2.  The planner asks for confirmation, then books.
3.  One person pays the venue from their own PayPal account.
4.  The app splits the total across everyone who said yes. Each of them owes the payer
    their share, shown as a balance.
5.  Members settle through PayPal. The app sends reminders until every balance is clear.

Carried over from the backend spec: amounts are integer cents, every PayPal call is
idempotent, webhooks are verified, the ledger is append-only, and no AI is in the payment
path. Screens show whole dollars for budgets and dollars and cents for money owed.

End-to-end user flow

user flow · 14 steps in four stages

A new user passes through setup once. After that each hangout runs through Plan,
Commit, and Pay and close, and the planner loops back to Plan when no option fits or
nobody says yes. Page numbers match the page map in the next section.

                                                                                                           Page 3 of 18

## PDF page 4

Unspoken: Experience and Pages Spec

Page map

The app has 23 screens in five groups. Page numbers below are used throughout this
spec.

# Page Group Purpose

P1 Splash Entry Animated logo on every open

P2 Sign in Entry Verify the phone number

P3 Subscription Entry Start the $15 monthly plan

P4 Profile creation Entry Bio, interests, private limits, calendar, PayPal,
permissions

P5 Home Home Floating pods, plus button, hub entry

P6 Create a pod Home Pick contacts, name the pod, invite

P7 Pod chat Pod Group chat with the planner inside it

P8 Pod settings Pod Members, meeting rhythm, group activities

P9 Activity shortlist and Pod Planner's list of activities, visible votes
vote

P10 Time poll Pod Planner's best days and times, visible votes

P11 Ready check Pod Members say whether they are in

P12 Booking confirmation Pod Planner asks before booking, then reminds

P13 Payer and split Money Who pays and each person's share

P14 Settle up Money Pay what you owe through PayPal

P15 Money page Money All balances across pods

P16 Events search Hub Browse NYC events and activities

P17 Event detail Hub One event, with suggest-to-pod

P18 Calendar Hub Personal calendar and connected calendars

P19 Profile Hub Bio, number, interests, private limits

P20 Settings Hub Notifications, permissions, subscription,
privacy

                                                                                                              Page 4 of 18

## PDF page 5

Unspoken: Experience and Pages Spec

# Page Group Purpose

P21 Payment methods Hub Linked PayPal account

P22 Private planner chat Hub One-to-one chat with the planner, including
budget asks

P23 After the hangout Pod Rating and a shared memory

Pages: entry and onboarding (P1 to P4)

A new user passes through these four pages once. A returning user goes from the splash
straight to Home.

P1 Splash

      On the page: the app logo animates and turns.
      Next: P2 if signed out, P5 if signed in.
      Backend: checks the session and preloads the user's pods.
      Motion: the logo turn is the first designed animation. Assets to come.

P2 Sign in

      On the page: phone number field, code entry, links to terms and privacy.
      Actions: request a code, enter it, continue.
      Backend: phone verification and a session token. The sign-in method is not yet
      chosen (section 12).

P3 Subscription

      On the page: the $15-a-month plan, three lines on what it includes (the planner, polls
      and booking, PayPal splitting), a start button, and restore purchase.
      Actions: start the plan through the phone's app store billing.
      Backend: verifies the purchase receipt and stores plan status. A free trial and who
      pays are open (section 12).

P4 Profile creation

A stepper of six short screens. Every answer here is editable later from P19.

                                                                                                           Page 5 of 18

## PDF page 6

Unspoken: Experience and Pages Spec

    1. Basics. Name, photo, bio, and phone number (prefilled from sign-in).
    2. Interests. The user picks everything they like doing: activities, cuisines, and the kinds
      of parties or events they go to. These feed the planner. Backend needs a fixed interest
      list for this (section 12).
    3. Private limits. Budget per hangout in whole dollars, dietary needs, dislikes, and
      longest travel time. A persistent lock badge reads "Only you and your planner see
      this."
    4. Calendar. Connect Google Calendar. Other calendars are open (section 12).
    5. PayPal. Link a PayPal account. Required before the user can pay or be paid in a
      hangout.
    6. Permissions. Contacts (to build pods), notifications (polls and reminders), calendar.
      Each gets a one-line reason. Declining contacts leaves invite links as the only way to
      build a pod.

Backend: a profile record, interest tags, an encrypted per-user store for private limits that
only that user's planner can read (the Constraint Vault from the backend spec), calendar
and PayPal account links, and permission status.

Pages: home and pods (P5 and P6)

P5 Home

The home screen is a field of organic bubbles floating at different positions. Each bubble
is one pod.

      On a bubble: pod name and member count. A quiet state cue shows where the pod's
      current hangout stands (none, planning, poll open, booking pending, payments open).
      No cue ever shows a single member's status.
      Plus button: opens P6.
      Hub entry: a persistent way into the hub: Events search (P16), Calendar (P18), Profile
      (P19), Settings (P20), Payment methods (P21), Money (P15), and the private planner
      chat (P22). Its placement is a design choice.
      Private chat badge: a dot when the planner has asked the user something privately,
      such as a budget stretch.
      Tap a bubble: opens that pod's chat, P7.
      Empty state: no pods yet, so one large bubble invites the user to create the first.
      Backend: returns the user's pods with a one-line stage summary and updates it live.







                                                                                                             Page 6 of 18

## PDF page 7

Unspoken: Experience and Pages Spec

      Motion: bubble drift and the pod-created animation are placeholders for later assets.

P6 Create a pod

    1. The user taps the plus button. If contacts permission is missing, the app asks for it
      and explains why.
    2. A searchable contact list appears. Contacts already on the app can be selected.
      Others can be invited with a link (confirm in section 12).
    3. The user selects friends. A pod needs 3 to 8 people including the creator, as in the
      backend spec.
    4. The user names the pod and creates it.
    5. Invited friends get a notification and accept to join (recommended).
    6. The new bubble appears on Home with a birth animation, and the pod chat opens.
      If contacts permission is declined: the user can still create a pod and share an invite
      link.
      Backend: matches contacts to accounts by phone number, stores pod and
      membership records, creates single-use invite links, and enforces the 3 to 8 limit.

Pages: inside a pod (P7 to P12)

Everything the planner does for a pod happens inside the pod chat as cards, so the group
sees one conversation.

P7 Pod chat

      On the page: pod name and members at the top, the message list, a composer, and a
      line showing the pod's next hangout.
      Planner cards in the stream: the activity shortlist (P9), the time poll (P10), the ready
      check (P11), the booking confirmation (P12), and the payer and split (P13). The planner
      appears as its own participant.
      Actions: send messages, open a card, tap the header for pod settings (P8).
      Backend: real-time messaging with push notifications, message storage, and a way for
      the planner to post structured cards. Chat extras such as photos, reactions, and read
      receipts are open (section 12).
















                                                                                                            Page 7 of 18

## PDF page 8

Unspoken: Experience and Pages Spec

P8 Pod settings

      Members: names and photos, with leave pod and, for the creator, add or remove.
      Meeting rhythm: how often the pod meets. A member proposes a rhythm in the chat,
      such as weekly, every two weeks, or monthly. When the pod agrees, it becomes the
      default. Any member can propose a change later the same way. How agreement is
      reached is open (section 12).
      Group activities: specific things the pod wants to do, added by any member. The
      planner prefers these over general interests.
      Mute: silence notifications for this pod.
      Backend: stores the rhythm, the next hangout date, and the group activity list. The
      planner starts planning on the rhythm date.

P9 Activity shortlist and vote

When the rhythm date arrives, the planner posts a shortlist of NYC activities in the chat.

      On each card: title, venue or organizer, date and time for events, about how much
      each person pays, tags, and a vote button.
      How the list is built: from members' profile interests and the pod's group activities,
      then checked against every member's private budget, dietary needs, dislikes, and
      travel limit. The group never sees why an option is missing.
      Budget stretch: if no good option fits one member's budget, the planner sends that
      member a private message in P22 asking whether a different budget is okay for this
      time only. The group never sees the ask or the answer.
      Votes: visible to the pod, with names.
      No labels: no card says "budget-friendly" or "why this one."
      Backend: an NYC events and venues catalog (seeded for the demo), a ranker, and a
      private check per member that returns only works or doesn't work.

P10 Time poll

      On the card: the best days and times that fit the pod, found from connected
      calendars, a vote button on each, and a closing time.
      Actions: vote, change a vote before it closes.
      Votes: visible to the pod, with names. Members are notified when the poll opens and
      reminded before it closes.
      No slot works: the planner offers to widen the window.







                                                                                                           Page 8 of 18

## PDF page 9

Unspoken: Experience and Pages Spec

      Backend: reads free or busy time from connected calendars, ranks slots, creates the
      poll, and schedules the closing and reminders. Whether the activity and time polls are
      one poll or two is open (section 12).

P11 Ready check

      On the card: the chosen plan and time, and a yes or no for each member.
      Rule: any number of yeses is enough to go ahead. Members who say yes are the ones
      who share the cost.
      Why it comes before booking: the planner needs a head count to book a table or
      tickets and to split the cost.
      If nobody says yes: the plan closes and the planner offers the next-best option.
      Backend: stores each member's answer and passes the head count to booking and to
      the split. This order is recommended and is flagged in section 12.

P12 Booking confirmation

      On the card: what will be booked, for how many, when, and the estimated cost, with a
      confirm button.
      Rule: the planner books nothing until it gets confirmation, and sends reminders until it
      does. Who confirms is open (section 12).
      Status chip: waiting for confirmation, booking, booked, or could not book. A failed
      booking offers the next-best plan.
      Restaurants: the planner reserves a table for the chosen time.
      Parties and events: the planner may contact the organizer to ask about ticket prices.
      It asks for the same confirmation before it sends anything.
      After booking: the event is blocked on connected calendars. Whose calendars is
      open (section 12).
      Backend: reservation and ticket outreach, with a simulated booking path for seeded
      NYC venues in the demo, status tracking, reminder jobs, and calendar writes.

Pages: money and after the hangout (P13 to P15, P23)

PayPal is the center of this part of the app. One member pays the venue, and the members
who said yes each owe that member their share.

                                                                                                          Page 9 of 18

## PDF page 10

Unspoken: Experience and Pages Spec

P13 Payer and split

      On the card: the total cost, who pays, and each yes-member's share. Nobody who
      said no appears in the split.
      Choosing the payer: open (section 12). The payer must have a linked PayPal account.
      Split: equal by default. Shares are rounded so they add up to the total, with any
      leftover cents going to the first shares in random order, as in the backend spec. A
      custom split is open.
      Estimate and actual: balances start from the estimate. After the event the payer
      enters the final amount, and every balance updates to match.
      Actions: the payer confirms the split. Members see their share and the payer's name.
      Backend: creates one balance per member in the ledger the moment the payer
      confirms, and notifies each member.

P14 Settle up

      For someone who owes: who they owe, for which hangout, how much, and a Pay with
      PayPal button. The button opens PayPal approval and returns to the app.
      For the payer: each person who owes them and whether it is owed, pending, or paid.
      Statuses: owed, pending, paid, failed.
      Reminders: private to each person who still owes. They never go into the pod chat.
      Backend: creates each PayPal payment, confirms it from PayPal's webhook, and writes
      the result to the ledger. Retries must not charge twice. A failed payment returns the
      balance to owed and tells the member. Which PayPal product moves money to a
      friend's account is open (section 12).

P15 Money page

      On the page: two totals at the top, what you owe and what you are owed, then a list by
      hangout and pod.
      Actions: tap any line to open P14. Filter by pod. See paid history.
      Backend: computes every balance from the append-only ledger and never stores a
      balance directly.

P23 After the hangout

      Rating: one tap, loved it, fine, or not for me. It goes only to the member's own planner
      and tunes their future suggestions, as in the backend spec.







                                                                                                          Page 10 of 18

## PDF page 11

Unspoken: Experience and Pages Spec

      Next step: the planner shows the next hangout date from the pod's rhythm.
      Idea, not in your flow: a shared memory page for each hangout, with photos members
      add, collected into the pod as a growing record of the group.

Pages: the hub (P16 to P22)

The hub is reached from Home. It holds everything personal to the user: events, calendar,
profile, settings, payment account, and the private chat with the planner.

P16 Events search

      On the page: a search bar, filters (date, price, category, neighborhood), and a list of
      event and activity cards across NYC.
      Actions: search, filter, open an event (P17).
      Backend: an NYC events and activities catalog. The demo uses a seeded list. The
      production data source is not chosen.

P17 Event detail

      On the page: title, venue or organizer, date and time, price, description, a map, and
      tags.
      Actions: suggest to a pod, save, add to calendar.
      Suggest to a pod: the user picks a pod, and the event is posted in that pod's chat as a
      suggestion the planner adds to its next shortlist.
      Backend: stores saved events and suggestions per pod.

P18 Calendar

      On the page: the user's own calendar in week and month views, showing connected
      calendars and Unspoken hangouts together.
      Actions: connect or disconnect a calendar, choose which calendars the planner may
      read, and open a hangout.
      Calendars: Google Calendar is the planned connection. Apple Calendar and Outlook
      are open (section 12).
      What the planner reads: free or busy time only, as recommended in the core rules.
      Backend: calendar account links, free or busy reads, and event writes when a plan is
      booked.









                                                                                                          Page 11 of 18

## PDF page 12

Unspoken: Experience and Pages Spec

P19 Profile

      On the page: photo, name, bio, phone number, interests, and private limits.
      Interests: the same picker as profile creation, editable at any time.
      Private limits: budget in whole dollars, dietary needs, dislikes, and travel time, behind
      a lock badge reading "Only you and your planner see this."
      Backend: edits apply from the planner's next run. Private limits stay in the encrypted
      per-user store.

P20 Settings

      Notifications: on or off for each type: polls, reminders, private planner asks, and
      money.
      Permissions: current status of contacts, calendar, and notifications, with a shortcut to
      the phone's settings.
      Subscription: plan status and a link to manage it in the app store.
      Privacy: a plain explanation of what the planner can see and what the pod can see.
      Account: log out and delete account.

P21 Payment methods

      On the page: the linked PayPal account and its status, with link and unlink.
      Bank details: the app never stores bank or card numbers. Banks and cards are
      managed inside PayPal.
      Backend: stores the PayPal account link and nothing else about the user's money
      sources.

P22 Private planner chat

A one-to-one chat between the user and their planner. The pod never sees it.

      Budget stretch asks: a card that says what the option costs and asks whether a
      different budget is okay for this time only. The user taps yes or no. If there is no
      answer by a deadline, the option is dropped without telling the pod (recommended).
      Other private asks: reminders about things waiting on the user, such as a
      confirmation or a payment owed.
      Free text: the user can tell the planner new limits in their own words. The planner
      shows what it understood as editable chips and saves nothing until the user confirms.









                                                                                                            Page 12 of 18

## PDF page 13

Unspoken: Experience and Pages Spec

      Backend: a private message store per user, stretch ask records that apply to one
      hangout only, and no write path from this chat into any pod.

Permissions, notifications, and edge cases

Rows marked (recommended) are proposals for you to confirm, not decisions.

Permissions

Permission Used for Asked at If declined

Contacts Building pods P4 step 6, or the Pods are built with invite
first tap of the plus links only
button

Calendar Finding times and P4 step 4 The planner asks the
blocking booked member for times in the
events private chat
(recommended)

Notifications Polls, reminders, P4 step 6 Reminders show only inside
private asks, money the app

PayPal link Paying and being paid P4 step 5 The member can chat and
vote but cannot say yes in a
ready check until linked
(recommended)

Notifications

Event Goes to Note

Pod invite The invited friend Accept to join

Shortlist posted The pod

Time poll opened, The pod, then members who Reminders are private, never a
closing soon have not voted call-out in the chat

Budget stretch ask That member only Lives in P22

Ready check The pod

                                                                                                            Page 13 of 18

## PDF page 14

Unspoken: Experience and Pages Spec

Event Goes to Note

Booking confirmation Whoever confirms Repeats until confirmed
needed

Booked The pod Also written to calendars

Balance created The payer and each member
who owes

Payment received or The payer and the member
failed who paid

Balance reminder Each member who still owes Private, never in the pod chat

Edge cases

Situation What the app does

No pods yet Home shows one large bubble inviting the first pod

No plan fits everyone The planner offers to widen the date window or
area. It never says whose limit blocked a plan

Nobody votes by the close The planner extends once, then closes the poll
(recommended)

Tied vote Lower cost wins, then the earlier start, as in the
backend spec (recommended)

Pod drops below 3 members Open: the 3-member minimum came from the old
hidden-vote design (section 12)

Booking fails The planner says so and offers the next-best plan

Payer drops out after booking Open: the pod picks a new payer (section 12)

A member says yes, then leaves Their balance stays until settled

A PayPal payment fails The balance returns to owed and the member is
told

Subscription ends Pods and history stay readable. The planner stops
planning (recommended)

                                                                                                             Page 14 of 18

## PDF page 15

Unspoken: Experience and Pages Spec

Situation What the app does

No connection Chat and cards load from the last sync. Actions
that move money wait for a connection

Motion and visual placeholders

The backend does not depend on any of this. Inspiration and assets come after the
backend is built, so engineers should leave a place for each moment below and no more.
PayPal blue is used only for line drawings, here and there, and never for fills or buttons.

Page Moment Source

P1 The logo animates and turns Your flow

P5 Pods float as organic bubbles in different parts of Your flow
the screen

P5 Bubbles drift toward each other when every Addition
member is free (recommended)

P5 to P7 A tapped bubble opens into its chat Your flow

P6 A new pod bubble is born Addition

P5, P8 The pod's meeting rhythm shows as a slow pulse in Addition
its bubble

P9, P10 Cards arrive in the chat and votes settle onto the Addition
winner

P12 A confirmed booking pops or settles the bubble Addition

P13 to P15 A blue line drawing threads from the payer to each Addition
member and fades as balances clear

Empty states Blue line drawings for the first pod, no events, and Addition
no balances

                                                                                                             Page 15 of 18

## PDF page 16

Unspoken: Experience and Pages Spec

More additions for later design

Addition Where it would What the backend needs
appear

Spontaneous mode: the planner P7 Calendar watching and a trigger
suggests a last-minute plan when outside the rhythm
calendars open up

Travel time and weather on activity P9, P17 A travel time source and a weather
cards source

Swipe browsing of events P16 None beyond the events catalog

Apple Calendar and Outlook P18 Two more calendar integrations
connections

Open decisions and handoff notes

The first table lists decisions only you can make. The second tells the backend team what
in the earlier spec no longer applies.

Decisions for you

# Decision Recommendation

1 Who pays the $15: each member, or one None yet
member for the pod

2 Free trial before the $15 starts None yet

3 Sign-in method Phone number and a text code, since the
profile holds a number

4 How the payer pays the venue: through Track what friends owe, and let the payer
PayPal in the app, or at the venue by any pay the venue however the venue takes
method with the app only tracking what payment
friends owe

5 How the payer is chosen A volunteer, with the planner suggesting a
rotation

6 Who confirms a booking The payer, since they front the money

                                                                                                           Page 16 of 18

## PDF page 17

Unspoken: Experience and Pages Spec

# Decision Recommendation

7 Order of ready check and booking Ready check first, because booking needs
a head count. The alternative is that a plan
vote also counts as the yes

8 One poll or two for activity and time Two cards in sequence: activity, then time

9 Whose calendars the booked event is Only members who said yes
blocked on

10 How a meeting rhythm is agreed Every member accepts the proposal

11 Minimum pod size Keep 3 to 8 for now. The 3-member
minimum was set for hidden votes, which
no longer apply

12 Contacts who are not on the app Invite them with a link

13 Chat extras: photos, reactions, read Photos and reactions yes, read receipts
receipts no

14 Who sees which balances Only the people involved in each balance

15 Whether members can see each other's None yet
interest lists

16 The fixed interest list used in profiles Design it with the NYC demo events in
mind

17 Only one member says yes The planner checks before going ahead

18 Split type Equal split only for the first version

19 If the payer drops out after booking The pod picks a new payer

20 Calendars beyond Google Apple and Outlook after the demo

                                                                                                               Page 17 of 18

## PDF page 18

Unspoken: Experience and Pages Spec

What changes from the earlier backend spec

Earlier backend spec This product What the backend team does

Each member's share is held, One member pays Remove authorize, capture, and
then all are captured together, and the others owe void flows. Build balances in the
or all are voided them. There are no ledger instead
holds

Hangout states A new state list is Proposed states: PLANNING,
COMMITTING, SETTLING, needed STRETCH_ASKS, ACTIVITY_VOTE,
VOIDING, NOT_HAPPENING, TIME_VOTE, READY_CHECK,
SETTLEMENT_FAILED AWAITING_CONFIRMATION,
BOOKING, BOOKED,
BALANCES_OPEN, SETTLED,
NO_PLAN, BOOKING_FAILED

Counts-only progress and Votes and yeses are Drop the count-only display. Keep
hidden votes visible with names the private budget checks, which
still return only works or doesn't
work

The venue is paid by each The payer pays the Drop the venue payee and Payouts
friend, or by a platform payout venue and friends fallback unless decision 4 brings
repay the payer them back

Coordinator Agent and Users see one The pod chat is the Coordinator.
Personal Agent planner The private chat is each user's
Personal Agent

PayPal Orders, Payouts, and Friends pay a Confirm which PayPal product can
the authorize webhooks friend's account pay a friend's personal account,
and rewrite the go/no-go test for a
payment between two sandbox
accounts with a webhook and a
repeat-safe retry

No subscription $15 monthly plan Add app store billing and a plan
check on the planner

Group UI and private agent A full chat app Add real-time messaging, push,
chat contact matching, calendar
connections, and an events catalog

                                                                                                           Page 18 of 18
