# Python Skills Type Errors - Technical Debt

## Issue
The Python skills package has numerous mypy type errors that need to be fixed properly. Currently using a very lenient mypy configuration to pass CI.

## Current State
- **mypy.ini** has `ignore_errors = True` to bypass all errors
- 63 actual type errors across 11 files
- Missing type stubs for some libraries (requests, markdown, PIL, etc.)

## Required Fixes

### 1. Install Missing Type Stubs
```bash
pip install types-requests types-Markdown
```

### 2. Fix Return Type Mismatches
- `src/skills/domain_mapping/prompts.py:282` - Wrong return type
- `src/skills/design_automation/typography_analyzer.py:105` - Dict type mismatch
- `src/skills/design_automation/color_extractor.py:252` - Tuple type mismatch

### 3. Fix Model Issues
- `src/skills/content_structuring/models.py:167` - ContentSchema assignment issue
- Various union type attribute access errors

### 4. Add Missing Type Annotations
- Multiple functions missing return type annotations
- Variables needing explicit type hints for lists

### 5. Fix API Response Type Issues
- `src/main.py` - AsyncGenerator union type errors with DomainMappingResponse

## Action Items
1. Install missing type stubs
2. Fix each type error systematically
3. Add proper type annotations
4. Update mypy.ini to strict configuration:
```ini
[mypy]
python_version = 3.11
strict = True
warn_return_any = True
warn_unused_configs = True
disallow_untyped_defs = True
```

## Benefits of Fixing
- Better IDE support and autocomplete
- Catch bugs at type-check time
- Improved code maintainability
- Better documentation through types

## Priority
Medium - Not blocking functionality but important for code quality

## References
- Original CI error output saved in this document
- mypy documentation: https://mypy.readthedocs.io/