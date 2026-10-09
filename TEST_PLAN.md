# Institutional Verification & Test Plan

This document outlines the standard operating procedures for verifying the **University Guest House Management Portal**.

## 1. Authentication & Security Tier
| Test Case | Procedure | Expected Result |
|-----------|-----------|-----------------|
| **Admin Authorization** | Login as `ADM-001` with `admin123` | Redirect to Dashboard with "Control Center" header and "Master Register" access. |
| **Role Restriction** | Login as Student; attempt manual URL access to `/portal-config` | Redirect to Dashboard; access denied. |
| **Institutional Domain** | Register with `user@gmail.com` | Success (allowed per config); `user@other.com` should show domain error. |
| **Identity Recovery** | Use "Forgot Password" with OTP `123456` | Password reset successful; new credentials grant access. |

## 2. Registration Logic (New Entry)
| Test Case | Procedure | Expected Result |
|-----------|-----------|-----------------|
| **Identity Validation** | Skip Name/ID Proof in Step 1 | Error messages triggered; cannot proceed to Step 2. |
| **Tariff Precision** | Select "University Staff" for 3 days AC stay | Total Amount should reflect ₹900 (3 * 300). |
| **Timeline Integrity** | Set Departure date EARLIER than Arrival date | Duration shows 0 days; Total Amount ₹0; Error on Continue. |
| **Admin Privilege** | Check "Institute Guest" option as Admin vs Staff | Only Admins see the "Institute Guest" (Official) classification. |
| **Room Collision** | Book Room 101 for March 20-22; try booking 101 for March 21-23 | Room 101 should be hidden/disabled in selection grid for overlapping dates. |

## 3. Ledger & Documentation
| Test Case | Procedure | Expected Result |
|-----------|-----------|-----------------|
| **Voucher Fidelity** | Complete stay and click "Direct Download" | PDF generated with University branding, guest details, and signature. |
| **Admin Filing** | Update Status to "Approved" + enter Receipt No | Status badge updates; Receipt details appear in Voucher Official Ledger section. |
| **Master Search** | Search Guest Register for partial name (e.g., "Amit") | Results filter instantly to matching records. |
| **Excel Accuracy** | Export a filtered list to XLSX | File contains Sl No, Guest Name, Room, and Total Amount columns correctly. |

## 4. System Maintenance
| Test Case | Procedure | Expected Result |
|-----------|-----------|-----------------|
| **Crest Update** | Upload new PNG in Portal Config | Sidebar and Topbar logos update globally across the app instantly. |
| **Geo-Node Sync** | Update Map URL in Config | Contact Us page iframe reflects new location coordinates immediately. |
