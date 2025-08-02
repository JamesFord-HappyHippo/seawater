# 🚨 API PATH CONFLICT - QUICK FIX NEEDED

## **Problem Identified**
```
API method "post" defined multiple times for path "/tim/integrations/batch/process"
```

## **Root Cause**
Two functions are defining the same API endpoint:

1. **`processEventsFunction`** 
   - Path: `/tim/integrations/batch/process` 
   - Method: POST

2. **`scheduledBatchProcessorFunction`**
   - Path: `/tim/integrations/batch/process` 
   - Method: POST

## **🔧 Quick Fix Required**

In your **template.yml**, find the `scheduledBatchProcessorFunction` and change its API path:

### **FIND THIS:**
```yaml
scheduledBatchProcessorFunction:
  Type: AWS::Serverless::Function
  Properties:
    # ... properties ...
    Events:
      ManualBatchProcessingEvent:
        Type: Api
        Properties:
          RestApiId: !Ref ApiGateway
          Path: /tim/integrations/batch/process  # ← DUPLICATE
          Method: POST
```

### **CHANGE TO:**
```yaml
scheduledBatchProcessorFunction:
  Type: AWS::Serverless::Function
  Properties:
    # ... properties ...
    Events:
      ManualBatchProcessingEvent:
        Type: Api
        Properties:
          RestApiId: !Ref ApiGateway
          Path: /tim/integrations/batch/scheduled  # ← FIXED
          Method: POST
```

## **Alternative Fix Options**

### **Option 1: Change Path (Recommended)**
- Change `scheduledBatchProcessorFunction` path to `/tim/integrations/batch/scheduled`

### **Option 2: Remove Duplicate Event**
- Remove the `ManualBatchProcessingEvent` from `scheduledBatchProcessorFunction` entirely if manual triggering isn't needed

### **Option 3: Change Method**
- Change one function to use PUT instead of POST

## **🚀 After Fix**
```bash
sam validate --template template.yml
sam deploy --template template.yml --stack-name Clarity2025
```

**The fix is simple - just change one API path to avoid the conflict!**
