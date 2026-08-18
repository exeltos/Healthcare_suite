# Healthcare Suite rc.85

## Patient scrolling
Desktop patient workspace now uses the intended fixed-tab model:
- Patient header and top patient tabs remain fixed.
- Summary scrolls as one independent content region.
- Standard list tabs keep their section header fixed and scroll only the records.
- Treatment & Precautions uses two independent scroll regions: therapy on the left and isolation/precautions on the right.
- The application footer remains outside these scroll regions.

## WHO session
Within the same WHO session:
- Number of professionals remains a session-level value.
- After adding an opportunity, the current professional identifier and professional category are retained.
- Moment, action, gloves and note reset for the next opportunity.
- Changing to another professional only requires changing the professional identifier/category when needed.

## Regression
`npm run audit:rc85`
Expected: 8/8.
