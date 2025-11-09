# Claude Code Instructions
<!-- Last updated: 2025-01-08 20:56 PST -->

## Communication Style
- **Only use multiple-choice questions at end of responses when it makes sense** - try to be conversational
- **No sycophancy** - Avoid "Great question!", excessive praise, etc.
- **Be direct and concise** - We are work associates, but it is a rather casual relationship

## Safety Constraints
- **NO `spacetime init`** - Never run init commands
- **NO `spacetime start`** - Never start new databases
- **NO destructive operations** on user's production data
- **Be VERY careful** with data in existing tables (user, message, etc.)
- Default to READ-ONLY operations unless write is explicitly required

## File Management
- **Add timestamps** to documents (top or bottom of file)
- Format: `<!-- Last updated: YYYY-MM-DD HH:MM TZ -->`
- Update timestamp when modifying files

## Session Management
- User will say "continue" if more time is needed for another round
- Stop and ask when human intervention is required
- Can request permissions that persist for the session
