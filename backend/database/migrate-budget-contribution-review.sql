-- Run after migrate-budget-fund-link.sql.
-- Existing recorded payments are treated as approved to preserve current balances.
ALTER TABLE `fund_contributions`
  ADD COLUMN `review_status` enum('Pending','Approved','Rejected') NOT NULL DEFAULT 'Approved' AFTER `remarks`,
  ADD COLUMN `proof_image` varchar(255) DEFAULT NULL AFTER `review_status`,
  ADD COLUMN `reviewed_by` int(11) DEFAULT NULL AFTER `recorded_by`,
  ADD COLUMN `reviewed_at` datetime DEFAULT NULL AFTER `reviewed_by`,
  ADD COLUMN `review_remarks` text DEFAULT NULL AFTER `reviewed_at`,
  ADD KEY `idx_contrib_review` (`fund_id`, `review_status`, `payment_date`);
