DELETE FROM quick_amount_presets
WHERE id NOT IN (
	SELECT MIN(id)
	FROM quick_amount_presets
	GROUP BY household_id, sort_order
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_quick_amount_presets_household_sort_unique
	ON quick_amount_presets(household_id, sort_order);
