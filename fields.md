| Field                   | Type             | Purpose / Notes                                   | Source     |
| ------------------------- | ------------------ | --------------------------------------------------- | ------------ |
| feedback_id             | UUID             | Unique identifier for each submission             | System     |
| timestamp_submitted     | DATETIME         | When user submitted the form                      | System     |
| timestamp_processed     | DATETIME         | When AI finished classification                   | System     |
| permit_type             | ENUM             | Entertainment, Building, Event, Liquor, etc.      | User       |
| category                | ENUM             | Broad issue type (Delays, Confusion, Costs, etc.) | User       |
| subcategory             | ENUM             | Specific bucket under category                    | User       |
| issue_description       | TEXT             | Free-text user input                              | User       |
| ai_summary              | TEXT             | Condensed version for readability                 | AI         |
| ai_clarification_needed | BOOLEAN          | Whether chatbot follow-up occurred                | AI         |
| ai_followup_notes       | TEXT             | Extracted clarifications                          | AI         |
| department_predicted    | ENUM             | Target agency (Licensing, ISD, Fire, etc.)        | AI         |
| sentiment_score         | FLOAT (-1 → +1) | Emotional tone                                    | AI         |
| impact_type             | ARRAY            | ["Time lost", "Financial cost", etc.]             | User or AI |
| urgency_level           | ENUM             | Low / Medium / High                               | AI or User |
| status                  | ENUM             | New / Routed / Acknowledged / Closed              | System     |
| followup_opt_in         | BOOLEAN          | Whether user wants updates                        | User       |
| user_contact_info       | JSON             | {email, phone, language_pref}                     | User       |
| language                | ENUM             | Detected language                                 | AI         |
| attachment_urls         | ARRAY            | Uploaded evidence                                 | User       |
| feedback_source         | ENUM             | Form / Chatbot / 311 / Email / Portal             | System     |
| device_type             | ENUM             | Web / Mobile / Kiosk                              | System     |
