# Prepaid meter advice

This context models a household prepaid electricity meter as an auditable daily money ledger. It exists so every forecast and recommendation can be traced back to the tariff and recharge history.

## Language

**Household case**:
One supplied household scenario containing an opening balance, consecutive daily readings, recharge history, forecast inputs, and habit-comparison inputs.
_Avoid_: User, account, customer

**Daily reading**:
The whole electricity units consumed on one calendar date.
_Avoid_: Meter reading, demand

**Monthly slab counter**:
The cumulative units consumed in a calendar month, reset to zero on the first day of the next month.
_Avoid_: Balance tier, recharge slab

**Daily energy charge**:
The sum of the day's units priced progressively across any monthly slab boundaries they cross.
_Avoid_: Bill, recharge cost

**Meter balance**:
Money available in the prepaid meter after deposits and consumed charges, which may fall below zero in a reconstructed history.
_Avoid_: Wallet, credit

**Recharge**:
A deposit into the meter balance at the start of a date. It does not reset or change the monthly slab counter.
_Avoid_: Payment, cost

**First recharge charge**:
The monthly demand charge and meter rent deducted once, when that month's first recharge occurs.
_Avoid_: Monthly fee, service charge

**Run-out date**:
The first forecast date whose end-of-day meter balance is zero or negative.
_Avoid_: Expiry date

**Target-date recharge**:
The non-negative deposit needed today to fund projected charges through the selected date, inclusive, after using the current meter balance.
_Avoid_: Recommended bill, monthly budget

**Higher-slab uplift**:
The part of an energy charge above pricing every projected unit at the first slab rate.
_Avoid_: Slab saving, penalty

**Low-balance habit**:
A comparison policy that deposits its case amount at the start of any day whose opening meter balance is below its threshold.
_Avoid_: Emergency plan, reactive savings

**Monthly habit**:
A comparison policy that deposits its case amount on the first day of each named comparison month.
_Avoid_: Monthly savings plan

**Consumed cost**:
Energy charges, VAT, and first recharge charges actually deducted during a simulation. Deposited recharge amounts are not cost.
_Avoid_: Spend, deposited amount
