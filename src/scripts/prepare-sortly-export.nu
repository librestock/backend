#!/usr/bin/env nu

# Normalize a Sortly item export into the canonical CSV consumed by
# backend/src/scripts/import-sortly.ts.
#
# Usage:
#   nu backend/scripts/prepare-sortly-export.nu ~/Downloads/sortly.csv ~/Downloads/sortly-normalized.csv

def main [input_path: path, output_path: path] {
  open $input_path
  | where "Entry Type" == "Item"
  | each {|row|
      let category_parts = [
        ($row."Primary Folder"? | default ""),
        ($row."Subfolder-level1"? | default ""),
        ($row."Subfolder-level2"? | default ""),
        ($row."Subfolder-level3"? | default ""),
        ($row."Subfolder-level4"? | default ""),
      ] | each {|part| $part | into string | str trim } | where {|part| $part != "" }

      {
        sku: ($row.SID? | default ""),
        name: ($row."Entry Name"? | default ""),
        category_path: (if ($category_parts | is-empty) { "Uncategorized" } else { $category_parts | str join " / " }),
        reorder_point: (if (($row."Min Level"? | default "" | into string | str trim) == "") { "0" } else { $row."Min Level" | into string }),
        quantity: (if (($row.Quantity? | default "" | into string | str trim) == "") { "0" } else { $row.Quantity | into string }),
        location: ($row.Location? | default ""),
        unit: ($row.Unit? | default ""),
        standard_price: ($row.Price? | default "" | into string),
        barcode: (if (($row."Barcode/QR1-Data"? | default "" | str trim) != "") { $row."Barcode/QR1-Data" } else { $row."Barcode/QR2-Data"? | default "" }),
        description: ($row.Notes? | default ""),
        notes: ($row.Notes? | default ""),
        is_active: "true",
        is_perishable: (if (($row."Expiry Date"? | default "" | str trim) == "") { "false" } else { "true" }),
        expiry_date: ($row."Expiry Date"? | default ""),
      }
    }
  | save --force $output_path
}
