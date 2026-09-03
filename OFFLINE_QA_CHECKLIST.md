# Offline behavior QA checklist for citizen app

## Goal
Verify the citizen app works without internet and automatically recovers when connectivity returns.

## Manual checklist

1. Turn off mobile data and Wi‑Fi on the test device.
2. Open the app and confirm the last cached region, risk status, and alerts still render instead of showing a blank/error screen.
3. Submit a hazard report while still offline.
4. Confirm the app shows a clear offline indicator and the report is marked as pending/queued locally, with no error thrown due to lack of network.
5. Turn network back on.
6. Confirm queued reports automatically sync in the background without requiring any user action.
7. Confirm the offline indicator clears and the report appears as submitted in the app and in the admin dashboard reports page.
8. Confirm no duplicates are created if sync retries occur.
9. Close the app while offline with a pending queue; reopen with connectivity restored and confirm the queue persists and syncs.
10. Simulate flaky connectivity and confirm retry/backoff behavior instead of silent failure.

## Automated coverage

- Local queue unit tests cover offline queuing and successful sync clearing of pending items.
- Retry behavior is covered by verifying failed items remain in the queue with their retry count incremented.

## Verified status

- The offline queue, persisted local storage, and automatic sync logic are implemented and verified in automated tests.
- Full device-based validation still requires physical testing on a real phone with Wi‑Fi/data toggling and the admin dashboard in view.
