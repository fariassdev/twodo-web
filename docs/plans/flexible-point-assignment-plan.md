# Flexible Point Assignment System - Simplified Implementation Plan

## Overview
Implement a system that allows overriding the default point assignment when completing tasks, with a fluid UI experience in both home and detail views. No audit history required.

## Current System Analysis

### Database Schema
- **tasks table**: Has `assignment_type` (strict_rotation, team_work, individual, anyone) and `assigned_to` (user ID or null)
- **task_completions table**: Records task completions with `completed_by` (user ID) and `points_earned` (integer)
- **Current behavior**: 
  - team_work: Creates one completion record per member with split points
  - Others: Creates one completion record for the completer with full points

### Current UI Flow
- **Home view**: Simple checkbox to complete task (no assignment override)
- **Task detail**: "Marcar como completada" button (no assignment override)

## Implementation Plan

### Phase 1: Backend Functions

#### 1.1 Modify `completeTask` function
- Add optional `assignmentOverride` parameter with:
  - `type`: 'team_work' | 'individual' | 'anyone'
  - `assignedTo`: string[] (array of profile IDs for individual/team_work)
- If override provided, use it instead of default assignment
- Create completion records based on override
- No audit record needed

#### 1.2 Create `updateTaskCompletionAssignment` function
- Accept taskId, new assignment type, and new assignedTo array
- Delete existing completion records for the task
- Create new completion records with new assignment
- Return success/error

#### 1.3 Create `getTaskCompletions` function
- Get all completion records for a task
- Return with profile information

### Phase 2: UI Components

#### 2.1 Create Snackbar Component
- Temporary notification (auto-dismiss after 5 seconds)
- Shows: "Tarea completada. Puntos asignados a: [Asignación]"
- Includes "Cambiar" button
- On "Cambiar" click: navigate to task detail with assignment editor focused

#### 2.2 Update `TodayTasksWidget`
- After task completion, show snackbar
- Pass task ID and assignment info to snackbar
- Handle "Cambiar" navigation

#### 2.3 Update `TaskDetails` - Pending Tasks
- Add assignment selector modal before completion
- Show default assignment pre-selected
- Options:
  - Default (from task)
  - Team work (split points between all members)
  - Individual (to specific user)
  - Anyone (to completer)
- Confirm button completes task with selected assignment

#### 2.4 Update `TaskDetails` - Completed Tasks
- Show current assignment clearly with avatars
- Add "Editar asignación de puntos" button
- On click: show assignment editor
- Save button redistributes points

### Phase 3: Translations

#### 3.1 Add to `en/translation.json`
```json
{
  "taskCompletion": {
    "completed": "Task completed",
    "pointsAssignedTo": "Points assigned to:",
    "change": "Change",
    "selectAssignment": "Select point assignment",
    "defaultAssignment": "Default",
    "teamWork": "Team work",
    "individual": "Individual",
    "anyone": "Anyone",
    "editAssignment": "Edit point assignment",
    "saveAssignment": "Save assignment",
    "assignmentUpdated": "Assignment updated successfully"
  }
}
```

#### 3.2 Add to `es/translation.json`
```json
{
  "taskCompletion": {
    "completed": "Tarea completada",
    "pointsAssignedTo": "Puntos asignados a:",
    "change": "Cambiar",
    "selectAssignment": "Seleccionar asignación de puntos",
    "defaultAssignment": "Predeterminada",
    "teamWork": "Equipo",
    "individual": "Individual",
    "anyone": "Cualquiera",
    "editAssignment": "Editar asignación de puntos",
    "saveAssignment": "Guardar asignación",
    "assignmentUpdated": "Asignación actualizada correctamente"
  }
}
```

## Detailed Implementation Steps

### Step 1: Backend Functions
1. Update `completeTask` in `queries.ts` to accept assignment override
2. Add `updateTaskCompletionAssignment` function in `queries.ts`
3. Add `getTaskCompletions` function in `queries.ts`
4. Update `useCompleteTaskMutation` in `queryHooks.ts` to pass override
5. Add `useUpdateTaskCompletionAssignmentMutation` hook in `queryHooks.ts`

### Step 2: UI Components
1. Create `Snackbar.tsx` component in `src/components/ui/`
2. Update `TodayTasksWidget.tsx` to show snackbar after completion
3. Update `TaskDetails.tsx`:
   - Add assignment selector modal for pending tasks
   - Add assignment editor for completed tasks
4. Create `AssignmentSelector.tsx` component
5. Create `AssignmentEditor.tsx` component

### Step 3: Translations
1. Update `en/translation.json`
2. Update `es/translation.json`

### Step 4: Testing
1. Test task completion with default assignment
2. Test task completion with override assignment
3. Test assignment change from home view snackbar
4. Test assignment change from task detail view
5. Test points redistribution

## Technical Considerations

### Points Redistribution Logic
When changing assignment:
1. Calculate new points distribution based on new assignment type
2. Delete existing completion records
3. Create new completion records
4. Ensure points total remains the same (task.points)

### Error Handling
- Handle cases where task doesn't exist
- Handle cases where task is not completed
- Handle network errors gracefully
- Show user-friendly error messages

## UI/UX Flow Diagrams

### Home View Flow
```
User clicks complete button
  ↓
Task completed with default assignment
  ↓
Snackbar appears: "Tarea completada. Puntos asignados a: [Asignación]"
  ↓
[Auto-dismiss after 5s] OR [User clicks "Cambiar"]
  ↓
If "Cambiar": Navigate to task detail with assignment editor focused
```

### Task Detail - Pending Task Flow
```
User clicks "Marcar como completada"
  ↓
Assignment selector modal appears
  ↓
User selects assignment (default pre-selected)
  ↓
User clicks "Confirmar"
  ↓
Task completed with selected assignment
  ↓
Navigate to home OR stay on detail (show completed state)
```

### Task Detail - Completed Task Flow
```
User views completed task
  ↓
Sees current assignment with avatars
  ↓
Clicks "Editar asignación de puntos"
  ↓
Assignment editor appears
  ↓
User changes assignment
  ↓
User clicks "Guardar"
  ↓
Points redistributed
  ↓
UI updates to show new assignment
```

## Success Criteria
1. ✅ User can override default assignment when completing task
2. ✅ Snackbar appears in home view after completion
3. ✅ "Cambiar" button navigates to task detail
4. ✅ Task detail shows assignment selector for pending tasks
5. ✅ Task detail shows assignment editor for completed tasks
6. ✅ Points are correctly redistributed when assignment changes
7. ✅ UI is fluid and coherent in both views
8. ✅ Translations are complete for EN and ES

## Files to Modify
- `src/lib/queries.ts` - Backend functions
- `src/lib/queryHooks.ts` - React Query hooks
- `src/components/TaskDetails.tsx` - Task detail UI
- `src/components/dashboard/TodayTasksWidget.tsx` - Home view UI
- `src/components/ui/Snackbar.tsx` - New snackbar component
- `src/components/AssignmentSelector.tsx` - New selector component
- `src/components/AssignmentEditor.tsx` - New editor component
- `src/locales/en/translation.json` - English translations
- `src/locales/es/translation.json` - Spanish translations

## Overview
Implement a system that allows overriding the default point assignment when completing tasks, with a fluid UI experience in both home and detail views. No audit history required.

## Current System Analysis

### Database Schema
- **tasks table**: Has `assignment_type` (strict_rotation, team_work, individual, anyone) and `assigned_to` (user ID or null)
- **task_completions table**: Records task completions with `completed_by` (user ID) and `points_earned` (integer)
- **Current behavior**: 
  - team_work: Creates one completion record per member with split points
  - Others: Creates one completion record for the completer with full points

### Current UI Flow
- **Home view**: Simple checkbox to complete task (no assignment override)
- **Task detail**: "Marcar como completada" button (no assignment override)

## Implementation Plan

### Phase 1: Backend Functions

#### 1.1 Modify `completeTask` function
- Add optional `assignmentOverride` parameter with:
  - `type`: 'team_work' | 'individual' | 'anyone'
  - `assignedTo`: string[] (array of profile IDs for individual/team_work)
- If override provided, use it instead of default assignment
- Create completion records based on override
- No audit record needed

#### 1.2 Create `updateTaskCompletionAssignment` function
- Accept taskId, new assignment type, and new assignedTo array
- Delete existing completion records for the task
- Create new completion records with new assignment
- Return success/error

#### 1.3 Create `getTaskCompletions` function
- Get all completion records for a task
- Return with profile information

### Phase 2: UI Components

#### 2.1 Create Snackbar Component
- Temporary notification (auto-dismiss after 5 seconds)
- Shows: "Tarea completada. Puntos asignados a: [Asignación]"
- Includes "Cambiar" button
- On "Cambiar" click: navigate to task detail with assignment editor focused

#### 2.2 Update `TodayTasksWidget`
- After task completion, show snackbar
- Pass task ID and assignment info to snackbar
- Handle "Cambiar" navigation

#### 2.3 Update `TaskDetails` - Pending Tasks
- Add assignment selector modal before completion
- Show default assignment pre-selected
- Options:
  - Default (from task)
  - Team work (split points between all members)
  - Individual (to specific user)
  - Anyone (to completer)
- Confirm button completes task with selected assignment

#### 2.4 Update `TaskDetails` - Completed Tasks
- Show current assignment clearly with avatars
- Add "Editar asignación de puntos" button
- On click: show assignment editor
- Save button redistributes points

### Phase 3: Translations

#### 3.1 Add to `en/translation.json`
```json
{
  "taskCompletion": {
    "completed": "Task completed",
    "pointsAssignedTo": "Points assigned to:",
    "change": "Change",
    "selectAssignment": "Select point assignment",
    "defaultAssignment": "Default",
    "teamWork": "Team work",
    "individual": "Individual",
    "anyone": "Anyone",
    "editAssignment": "Edit point assignment",
    "saveAssignment": "Save assignment",
    "assignmentUpdated": "Assignment updated successfully"
  }
}
```

#### 3.2 Add to `es/translation.json`
```json
{
  "taskCompletion": {
    "completed": "Tarea completada",
    "pointsAssignedTo": "Puntos asignados a:",
    "change": "Cambiar",
    "selectAssignment": "Seleccionar asignación de puntos",
    "defaultAssignment": "Predeterminada",
    "teamWork": "Equipo",
    "individual": "Individual",
    "anyone": "Cualquiera",
    "editAssignment": "Editar asignación de puntos",
    "saveAssignment": "Guardar asignación",
    "assignmentUpdated": "Asignación actualizada correctamente"
  }
}
```

## Detailed Implementation Steps

### Step 1: Backend Functions
1. Update `completeTask` in `queries.ts` to accept assignment override
2. Add `updateTaskCompletionAssignment` function in `queries.ts`
3. Add `getTaskCompletions` function in `queries.ts`
4. Update `useCompleteTaskMutation` in `queryHooks.ts` to pass override
5. Add `useUpdateTaskCompletionAssignmentMutation` hook in `queryHooks.ts`

### Step 2: UI Components
1. Create `Snackbar.tsx` component in `src/components/ui/`
2. Update `TodayTasksWidget.tsx` to show snackbar after completion
3. Update `TaskDetails.tsx`:
   - Add assignment selector modal for pending tasks
   - Add assignment editor for completed tasks
4. Create `AssignmentSelector.tsx` component
5. Create `AssignmentEditor.tsx` component

### Step 3: Translations
1. Update `en/translation.json`
2. Update `es/translation.json`

### Step 4: Testing
1. Test task completion with default assignment
2. Test task completion with override assignment
3. Test assignment change from home view snackbar
4. Test assignment change from task detail view
5. Test points redistribution

## Technical Considerations

### Points Redistribution Logic
When changing assignment:
1. Calculate new points distribution based on new assignment type
2. Delete existing completion records
3. Create new completion records
4. Ensure points total remains the same (task.points)

### Error Handling
- Handle cases where task doesn't exist
- Handle cases where task is not completed
- Handle network errors gracefully
- Show user-friendly error messages

## UI/UX Flow Diagrams

### Home View Flow
```
User clicks complete button
  ↓
Task completed with default assignment
  ↓
Snackbar appears: "Tarea completada. Puntos asignados a: [Asignación]"
  ↓
[Auto-dismiss after 5s] OR [User clicks "Cambiar"]
  ↓
If "Cambiar": Navigate to task detail with assignment editor focused
```

### Task Detail - Pending Task Flow
```
User clicks "Marcar como completada"
  ↓
Assignment selector modal appears
  ↓
User selects assignment (default pre-selected)
  ↓
User clicks "Confirmar"
  ↓
Task completed with selected assignment
  ↓
Navigate to home OR stay on detail (show completed state)
```

### Task Detail - Completed Task Flow
```
User views completed task
  ↓
Sees current assignment with avatars
  ↓
Clicks "Editar asignación de puntos"
  ↓
Assignment editor appears
  ↓
User changes assignment
  ↓
User clicks "Guardar"
  ↓
Points redistributed
  ↓
UI updates to show new assignment
```

## Success Criteria
1. ✅ User can override default assignment when completing task
2. ✅ Snackbar appears in home view after completion
3. ✅ "Cambiar" button navigates to task detail
4. ✅ Task detail shows assignment selector for pending tasks
5. ✅ Task detail shows assignment editor for completed tasks
6. ✅ Points are correctly redistributed when assignment changes
7. ✅ UI is fluid and coherent in both views
8. ✅ Translations are complete for EN and ES

## Files to Modify
- `src/lib/queries.ts` - Backend functions
- `src/lib/queryHooks.ts` - React Query hooks
- `src/components/TaskDetails.tsx` - Task detail UI
- `src/components/dashboard/TodayTasksWidget.tsx` - Home view UI
- `src/components/ui/Snackbar.tsx` - New snackbar component
- `src/components/AssignmentSelector.tsx` - New selector component
- `src/components/AssignmentEditor.tsx` - New editor component
- `src/locales/en/translation.json` - English translations
- `src/locales/es/translation.json` - Spanish translations

Task completed with selected assignment
  ↓
Navigate to home OR stay on detail (show completed state)
```

### Task Detail - Completed Task Flow
```
User views completed task
  ↓
Sees current assignment with avatars
  ↓
Clicks "Editar asignación de puntos"
  ↓
Assignment editor appears
  ↓
User changes assignment
  ↓
User clicks "Guardar"
  ↓
Points redistributed
  ↓
Audit record created
  ↓
UI updates to show new assignment
```

## Success Criteria
1. ✅ User can override default assignment when completing task
2. ✅ Snackbar appears in home view after completion
3. ✅ "Cambiar" button navigates to task detail
4. ✅ Task detail shows assignment selector for pending tasks
5. ✅ Task detail shows assignment editor for completed tasks
6. ✅ Points are correctly redistributed when assignment changes
7. ✅ Audit history is maintained
8. ✅ UI is fluid and coherent in both views
9. ✅ Translations are complete for EN and ES
10. ✅ No performance degradation

## Files to Modify
- `supabase/migrations/` - New migration file
- `src/lib/queries.ts` - Backend functions
- `src/lib/queryHooks.ts` - React Query hooks
- `src/lib/database.types.ts` - TypeScript types (auto-generated)
- `src/components/TaskDetails.tsx` - Task detail UI
- `src/components/dashboard/TodayTasksWidget.tsx` - Home view UI
- `src/components/ui/Snackbar.tsx` - New snackbar component
- `src/components/AssignmentSelector.tsx` - New selector component
- `src/components/AssignmentEditor.tsx` - New editor component
- `src/locales/en/translation.json` - English translations
- `src/locales/es/translation.json` - Spanish translations

## Overview
Implement a system that allows overriding the default point assignment when completing tasks, with audit history and a fluid UI experience in both home and detail views.

## Current System Analysis

### Database Schema
- **tasks table**: Has `assignment_type` (strict_rotation, team_work, individual, anyone) and `assigned_to` (user ID or null)
- **task_completions table**: Records task completions with `completed_by` (user ID) and `points_earned` (integer)
- **Current behavior**: 
  - team_work: Creates one completion record per member with split points
  - Others: Creates one completion record for the completer with full points

### Current UI Flow
- **Home view**: Simple checkbox to complete task (no assignment override)
- **Task detail**: "Marcar como completada" button (no assignment override)
- **No audit history** of assignment changes

## Implementation Plan

### Phase 1: Database Schema Changes

#### 1.1 Create `task_completion_audit` table
```sql
CREATE TABLE task_completion_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id),
  household_id UUID NOT NULL REFERENCES households(id),
  changed_by UUID NOT NULL REFERENCES profiles(id),
  previous_assignment_type TEXT NOT NULL,
  previous_completed_by UUID[] NOT NULL, -- Array of profile IDs who had points
  new_assignment_type TEXT NOT NULL,
  new_completed_by UUID[] NOT NULL, -- Array of profile IDs who have points now
  points_redistributed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### 1.2 Add `assignment_type` column to `task_completions`
```sql
ALTER TABLE task_completions 
ADD COLUMN assignment_type TEXT NOT NULL DEFAULT 'individual';
```

This helps track what assignment type was used at completion time for audit purposes.

### Phase 2: Backend Functions

#### 2.1 Modify `completeTask` function
- Add optional `assignmentOverride` parameter
- If provided, use override instead of default assignment
- Create completion records based on override
- Create audit record if override differs from default

#### 2.2 Create `updateTaskCompletionAssignment` function
- Accept taskId, new assignment type, and new completed_by array
- Delete existing completion records for the task
- Create new completion records with new assignment
- Create audit record
- Return success/error

#### 2.3 Create `getTaskCompletions` function
- Get all completion records for a task
- Return with profile information

### Phase 3: UI Components

#### 3.1 Create Snackbar Component
- Temporary notification (3-5 seconds)
- Shows: "Tarea completada. Puntos asignados a: [Asignación]"
- Includes "Cambiar" button
- On "Cambiar" click: navigate to task detail with assignment editor focused

#### 3.2 Update `TodayTasksWidget`
- After task completion, show snackbar
- Pass task ID and assignment info to snackbar
- Handle "Cambiar" navigation

#### 3.3 Update `TaskDetails` - Pending Tasks
- Add assignment selector modal/dropdown before completion
- Show default assignment pre-selected
- Options:
  - Default (from task)
  - Team work (split points between all members)
  - Individual (to specific user)
  - Anyone (to completer)
- Confirm button completes task with selected assignment

#### 3.4 Update `TaskDetails` - Completed Tasks
- Show current assignment clearly with avatars
- Add "Editar asignación de puntos" button
- On click: show assignment editor
- Save button redistributes points and creates audit record

### Phase 4: Translations

#### 4.1 Add to `en/translation.json`
```json
{
  "taskCompletion": {
    "completed": "Task completed",
    "pointsAssignedTo": "Points assigned to:",
    "change": "Change",
    "selectAssignment": "Select point assignment",
    "defaultAssignment": "Default",
    "teamWork": "Team work",
    "individual": "Individual",
    "anyone": "Anyone",
    "editAssignment": "Edit point assignment",
    "saveAssignment": "Save assignment",
    "assignmentUpdated": "Assignment updated successfully"
  }
}
```

#### 4.2 Add to `es/translation.json`
```json
{
  "taskCompletion": {
    "completed": "Tarea completada",
    "pointsAssignedTo": "Puntos asignados a:",
    "change": "Cambiar",
    "selectAssignment": "Seleccionar asignación de puntos",
    "defaultAssignment": "Predeterminada",
    "teamWork": "Equipo",
    "individual": "Individual",
    "anyone": "Cualquiera",
    "editAssignment": "Editar asignación de puntos",
    "saveAssignment": "Guardar asignación",
    "assignmentUpdated": "Asignación actualizada correctamente"
  }
}
```

## Detailed Implementation Steps

### Step 1: Database Migration
1. Create new migration file
2. Add `task_completion_audit` table
3. Add `assignment_type` column to `task_completions`
4. Add RLS policies for audit table
5. Add indexes for performance

### Step 2: Backend Functions
1. Update `completeTask` in `queries.ts`
2. Add `updateTaskCompletionAssignment` function
3. Add `getTaskCompletions` function
4. Update `useCompleteTaskMutation` in `queryHooks.ts`
5. Add `useUpdateTaskCompletionAssignmentMutation` hook

### Step 3: UI Components
1. Create `Snackbar.tsx` component
2. Update `TodayTasksWidget.tsx`
3. Update `TaskDetails.tsx`:
   - Add assignment selector for pending tasks
   - Add assignment editor for completed tasks
4. Create `AssignmentSelector.tsx` component
5. Create `AssignmentEditor.tsx` component

### Step 4: Translations
1. Update `en/translation.json`
2. Update `es/translation.json`

### Step 5: Testing
1. Test task completion with default assignment
2. Test task completion with override assignment
3. Test assignment change from home view snackbar
4. Test assignment change from task detail view
5. Test audit record creation
6. Test points redistribution

## Technical Considerations

### Points Redistribution Logic
When changing assignment:
1. Calculate new points distribution based on new assignment type
2. Delete existing completion records
3. Create new completion records
4. Ensure points total remains the same (task.points)

### Audit Trail
- Every assignment change creates an audit record
- Stores both previous and new state
- Includes who made the change and when
- Does not delete audit records (append-only)

### Performance
- Add indexes on `task_id` in `task_completion_audit`
- Add indexes on `task_id` in `task_completions`
- Use optimistic updates in UI for better UX

### Error Handling
- Handle cases where task doesn't exist
- Handle cases where task is not completed
- Handle network errors gracefully
- Show user-friendly error messages

## UI/UX Flow Diagrams

### Home View Flow
```
User clicks complete button
  ↓
Task completed with default assignment
  ↓
Snackbar appears: "Tarea completada. Puntos asignados a: [Asignación]"
  ↓
[Auto-dismiss after 5s] OR [User clicks "Cambiar"]
  ↓
If "Cambiar": Navigate to task detail with assignment editor focused
```

### Task Detail - Pending Task Flow
```
User clicks "Marcar como completada"
  ↓
Assignment selector modal appears
  ↓
User selects assignment (default pre-selected)
  ↓
User clicks "Confirmar"
  ↓
Task completed with selected assignment
  ↓
Navigate to home OR stay on detail (show completed state)
```

### Task Detail - Completed Task Flow
```
User views completed task
  ↓
Sees current assignment with avatars
  ↓
Clicks "Editar asignación de puntos"
  ↓
Assignment editor appears
  ↓
User changes assignment
  ↓
User clicks "Guardar"
  ↓
Points redistributed
  ↓
Audit record created
  ↓
UI updates to show new assignment
```

## Success Criteria
1. ✅ User can override default assignment when completing task
2. ✅ Snackbar appears in home view after completion
3. ✅ "Cambiar" button navigates to task detail
4. ✅ Task detail shows assignment selector for pending tasks
5. ✅ Task detail shows assignment editor for completed tasks
6. ✅ Points are correctly redistributed when assignment changes
7. ✅ Audit history is maintained
8. ✅ UI is fluid and coherent in both views
9. ✅ Translations are complete for EN and ES
10. ✅ No performance degradation

## Files to Modify
- `supabase/migrations/` - New migration file
- `src/lib/queries.ts` - Backend functions
- `src/lib/queryHooks.ts` - React Query hooks
- `src/lib/database.types.ts` - TypeScript types (auto-generated)
- `src/components/TaskDetails.tsx` - Task detail UI
- `src/components/dashboard/TodayTasksWidget.tsx` - Home view UI
- `src/components/ui/Snackbar.tsx` - New snackbar component
- `src/components/AssignmentSelector.tsx` - New selector component
- `src/components/AssignmentEditor.tsx` - New editor component
- `src/locales/en/translation.json` - English translations
- `src/locales/es/translation.json` - Spanish translations

