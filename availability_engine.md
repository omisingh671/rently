# Availability Engine

## Tiny Version

Imagine Rently is helping a family find a place to sleep.

The availability engine is the helper that says:

> "For these dates, this many guests can book this room package."

It does not just show random rooms. It builds complete booking choices.

For example:

- 1 guest: Single Occupancy Room
- 2 guests: Double Occupancy Room
- 3 guests: Triple Room, or Double Room + Single Room
- 5 guests: Triple Room + Double Room
- 7 guests: Whole Apartment + Single Room

Each choice must be bookable, priced, and safe to send to checkout.

## The Building Blocks

Rently has this inventory shape:

```text
Property
  Unit / Apartment
    Room
```

Think of it like:

```text
Building
  Flat
    Bedroom
```

Rooms are booked as whole rooms. There is no bed-level booking.

Prices come from `RoomProduct` and `RoomPricing`.

That means the engine asks:

- Is this a single occupancy product?
- Is this a double occupancy product?
- Is this a triple occupancy product?
- Is this a whole apartment product?
- Is there a valid price for this product, comfort type, and date range?

It does not split a room price by person or bed.

## What The Engine Receives

The guest sends:

```text
Check-in date
Check-out date
Guest count
Comfort option: AC or Non-AC
Optional city
```

Example:

```text
Check-in: Jan 10
Check-out: Jan 12
Guests: 5
Comfort: AC
City: Kanpur Nagar
```

The engine turns this into a list of booking options.

## Step 1: Find Candidate Inventory

The engine first finds rooms and units that belong to active properties.

It only considers:

- active properties
- active units
- available rooms
- the requested city or property scope
- the selected comfort filter

If the guest asks for AC, non-AC rooms are ignored.

## Step 2: Remove Things That Cannot Be Booked

A room or unit is skipped if it has a conflict.

The engine checks:

- existing bookings
- maintenance blocks
- active inventory locks from someone else checking out

Example:

```text
Room A is available normally.
But someone already booked it for Jan 10 to Jan 12.
So Room A is not used.
```

For units, the overlap check is careful:

- if a whole unit is booked, its rooms are blocked
- if one room inside a unit is booked, the whole unit is blocked

This prevents double-booking the same physical space.

## Step 3: Find Valid Prices

An option is only created if every item has a valid price.

A price must match:

- property
- room or unit target
- product occupancy
- AC or Non-AC
- date validity
- minimum nights
- maximum nights

Example:

```text
Triple Room product
Occupancy: 3
Comfort: AC
Price: Rs. 3,250
```

If the guest needs a triple room but there is no active triple price, that triple room option is not shown.

## Step 4: Build Complete Booking Options

The engine creates complete packages, not loose room cards.

A package can be:

- one room
- one whole apartment
- multiple rooms in the same property
- whole apartment + room in the same property

It never combines rooms from different properties.

Good:

```text
Anand Homes:
  Triple Room + Double Room
```

Bad:

```text
Anand Homes Triple Room + City Stay Double Room
```

That bad option is never allowed.

## Step 5: Match Guest Count To Capacity

Every option must have enough capacity.

If the guest asks for 5 guests:

```text
Triple Room capacity: 3
Double Room capacity: 2
Total capacity: 5
Valid option
```

If the guest asks for 5 guests:

```text
Double Room capacity: 2
Single Room capacity: 1
Total capacity: 3
Not enough
Invalid option
```

The engine also calculates spare capacity.

```text
Requested guests: 5
Total capacity: 6
Spare capacity: 1
```

## Step 6: Name The Package

The engine gives each option a human-friendly title.

Examples:

- Single Occupancy Room
- Double Occupancy Room
- Triple Occupancy Room
- Whole Apartment
- Triple Room + Double Room
- 2 Double Rooms + 1 Single Room
- Whole Apartment + Single Room

It also creates helper labels:

```text
Item label: 2 rooms
Includes: 1 Triple Room + 1 Double Room
Guest split: 3 + 2 guests
```

This helps the frontend show clear cards.

## Step 7: Add Price Breakdown

Each option has totals and item prices.

Example:

```text
Triple Room: Rs. 3,250
Double Room: Rs. 2,250
Nightly total: Rs. 5,500
```

For a 2-night stay:

```text
Nightly total: Rs. 5,500
Stay total: Rs. 11,000
```

The old `priceBreakup` number list still exists for compatibility.

The new structured `priceBreakdown` is better for display.

## Step 8: Rank The Options

The engine sorts options so the best ones come first.

It prefers:

1. closest capacity match
2. lower spare capacity
3. lower price
4. fewer rooms/items
5. whole apartment when it fits well
6. better grouping

Example for 5 guests:

```text
Triple Room + Double Room
Capacity: 5
Spare: 0
Price: Rs. 5,500
```

This beats:

```text
Whole Apartment
Capacity: 6
Spare: 1
Price: Rs. 6,200
```

But the whole apartment can still appear as a more spacious private option.

## Step 9: Remove Duplicates

Sometimes many physical rooms create the same public-looking package.

Example:

```text
Double Room A: Rs. 2,250
Double Room B: Rs. 2,250
```

Both might produce:

```text
Double Occupancy Room
```

The guest does not need to see the same option twice.

So the engine removes duplicates using:

- property
- comfort
- guest split
- package composition
- product
- price

It still keeps different useful options, like:

```text
Double Occupancy Room
Triple Occupancy Room
Whole Apartment
```

## Step 10: Limit Results Per Property

The engine does not create endless combinations.

It keeps only the best options per property.

Current behavior:

```text
Up to 8 public options per property
```

This keeps the page clean and fast.

## What The API Sends To Frontend

Each option includes:

```text
optionId
propertyId
propertyLabel
title
optionType
requestedGuests
totalCapacity
spareCapacity
itemLabel
includedLabel
guestSplit
guestSplitParts
recommendationTags
comfortOption
nightlyTotal
stayTotal
priceBreakdown
items
images
```

The frontend does not receive real room IDs or unit IDs in public availability cards.

The guest chooses an opaque `optionId`.

That keeps internal inventory private.

## How Checkout Works

When a guest clicks Continue:

1. Frontend sends `bookingOptionId`.
2. Backend regenerates availability for the same dates and guests.
3. Backend checks that the selected option still exists.
4. Backend creates an inventory lock.
5. Frontend goes to checkout.
6. Checkout asks for a fresh quote.
7. Booking creation persists all package items as `BookingItem` rows.

This means checkout does not trust stale frontend data.

If someone else books the room first, the selected option disappears and checkout fails safely.

## Important Safety Rules

The engine must always protect these rules:

- Do not mix properties in one option.
- Do not show unavailable rooms or units.
- Do not show inactive rooms, units, or properties.
- Do not ignore maintenance.
- Do not ignore existing bookings.
- Do not ignore checkout locks.
- Do not show options without valid pricing.
- Do not book more guests than capacity.
- Do not expose internal room or unit IDs publicly.

## Tiny Story Example

A guest asks:

```text
5 guests
AC
Jan 10 to Jan 11
Kanpur Nagar
```

The engine thinks:

```text
Can I give them one room?
No, max room is 3 guests.

Can I give them rooms together?
Yes, Triple Room + Double Room = 5 guests.

Can I give them whole apartment?
Yes, Whole Apartment = 6 guests.

Which is best?
Triple Room + Double Room fits exactly and is cheaper.
Show it first.
```

Frontend shows:

```text
Triple Room + Double Room
2 rooms
Includes: 1 Triple Room + 1 Double Room
Guest split: 3 + 2 guests
5 guests requested · capacity 5 guests
Triple Room: Rs. 3,250
Double Room: Rs. 2,250
1 night total: Rs. 5,500
```

That is the availability engine doing its job.
