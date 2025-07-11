// client/src/components/editor/QuestionConfigForm.tsx
import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch'; // Added missing import
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, PlusCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface QuestionConfigFormProps {
  payload: any;
  onPayloadChange: (newPayload: any) => void;
}

// Debounce helper (same as SlideConfigPanel)
function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);
  const callbackRef = useRef(callback);
  
  // Keep callback reference current
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const debouncedCallback = useCallback((...args: Parameters<T>) => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    const newTimer = setTimeout(() => {
      callbackRef.current(...args);
    }, delay);
    setDebounceTimer(newTimer);
  }, [delay, debounceTimer]) as T;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, [debounceTimer]);

  return debouncedCallback;
}

export function QuestionConfigForm({ payload, onPayloadChange }: QuestionConfigFormProps) {
  const questionType = payload.question_type || payload.type || 'multiple_choice';
  
  // Local state for responsive editing
  const [localPayload, setLocalPayload] = useState(payload);
  
  // Update local state when payload changes from outside
  useEffect(() => {
    setLocalPayload(payload);
  }, [payload]);

  // Debounced update to parent
  const debouncedUpdate = useDebounce((newPayload: any) => {
    onPayloadChange(newPayload);
  }, 300); // Shorter delay for question settings

  // Initialize options when changing to multiple choice
  useEffect(() => {
    if (questionType === 'multiple_choice' && (!localPayload.options || localPayload.options.length === 0)) {
      const newPayload = {
        ...localPayload,
        options: [
          { value: 'option1', text: 'Option 1', description: '' },
          { value: 'option2', text: 'Option 2', description: '' }
        ]
      };
      setLocalPayload(newPayload);
      debouncedUpdate(newPayload);
    }
  }, [questionType]);

  // Safeguard: Ensure multiple choice questions always have options displayed
  const displayOptions = useMemo(() => {
    if (questionType === 'multiple_choice') {
      const currentOptions = localPayload.options || [];
      if (currentOptions.length === 0) {
        return [
          { value: 'option1', text: 'Option 1', description: '' },
          { value: 'option2', text: 'Option 2', description: '' }
        ];
      }
      return currentOptions;
    }
    return localPayload.options || [];
  }, [questionType, localPayload.options]);

  const handleFieldChange = (field: string, value: any) => {
    const newPayload = { ...localPayload, [field]: value };
    setLocalPayload(newPayload);
    debouncedUpdate(newPayload);
  };

  const handleOptionChange = (index: number, field: string, value: string) => {
    const newOptions = [...(localPayload.options || [])];
    newOptions[index] = { ...newOptions[index], [field]: value };
    handleFieldChange('options', newOptions);
  };

  const addOption = () => {
    // Correctly add a unique value to each new option
    const newOptions = [...(localPayload.options || []), { text: '', description: '', value: `option_${Date.now()}` }];
    handleFieldChange('options', newOptions);
  };

  const removeOption = (index: number) => {
    const newOptions = (localPayload.options || []).filter((_: any, i: number) => i !== index);
    handleFieldChange('options', newOptions);
  };

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <CardTitle className="text-lg text-white">Question Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label className="text-white/80">Question Type</Label>
          <div className="flex items-center space-x-2">
            <div className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 flex-1">
              <span className="text-white">
                {(localPayload.question_type || localPayload.type) === 'multiple_choice' && '✓ Multiple Choice'}
                {((localPayload.question_type || localPayload.type) === 'scale' || (localPayload.question_type || localPayload.type) === 'slider') && '📊 Scale Rating'}
                {(localPayload.question_type || localPayload.type) === 'text' && '✏️ Text Input'}
                {(localPayload.question_type || localPayload.type) === 'boolean' && '✅ Yes/No'}
                {!(localPayload.question_type || localPayload.type) && '✓ Multiple Choice'}
              </span>
            </div>
            <span className="text-white/40 text-sm">
              (Cannot be changed)
            </span>
          </div>
        </div>

        {(localPayload.question_type === 'multiple_choice' || localPayload.type === 'multiple_choice') && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                    <Label className="text-white/80">Answer Options</Label>
                    <Badge variant="secondary" className="bg-purple-600/20 text-purple-300">
                        {displayOptions.length} options
                    </Badge>
                </div>
                <div className="flex items-center space-x-2">
                    <Label htmlFor="allow_multiple" className="text-xs text-white/70">Allow Multiple</Label>
                    <Switch id="allow_multiple" checked={localPayload.allow_multiple || false} onCheckedChange={(checked) => handleFieldChange('allow_multiple', checked)} />
                </div>
            </div>
            {displayOptions.map((option: any, index: number) => (
              <div key={option.value || index} className="p-3 bg-black/20 rounded-lg border border-white/10 space-y-2">
                <div className="flex justify-between items-center"><Label className="text-white/70 text-sm">Option {index + 1}</Label><Button size="icon" variant="ghost" onClick={() => removeOption(index)} className="h-7 w-7 text-red-400 hover:bg-red-500/20"><Trash2 className="h-4 w-4" /></Button></div>
                <Input value={option.text || ''} onChange={(e) => handleOptionChange(index, 'text', e.target.value)} className="bg-white/10 border-white/20 text-white" placeholder="Option Text" />
              </div>
            ))}
            <Button onClick={addOption} variant="outline" className="w-full border-dashed"><PlusCircle className="mr-2 h-4 w-4" /> Add Option</Button>
          </div>
        )}

        {(localPayload.question_type === 'scale' || localPayload.question_type === 'slider' || localPayload.type === 'scale' || localPayload.type === 'slider') && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-white/80">Min Value</Label>
                <Input 
                  type="number" 
                  value={localPayload.scale_min || localPayload.min || 1} 
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    handleFieldChange('scale_min', value);
                    handleFieldChange('min', value); // Support both field names
                  }} 
                  className="bg-white/10 border-white/20 text-white" 
                />
              </div>
              <div>
                <Label className="text-white/80">Max Value</Label>
                <Input 
                  type="number" 
                  value={localPayload.scale_max || localPayload.max || 10} 
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    handleFieldChange('scale_max', value);
                    handleFieldChange('max', value); // Support both field names
                  }} 
                  className="bg-white/10 border-white/20 text-white" 
                />
              </div>
            </div>
            <div>
              <Label className="text-white/80">Step Size</Label>
              <Input 
                type="number" 
                value={localPayload.step || 1} 
                onChange={(e) => handleFieldChange('step', parseInt(e.target.value))} 
                className="bg-white/10 border-white/20 text-white" 
                placeholder="1"
              />
            </div>
            <div>
              <Label className="text-white/80">Min Label</Label>
              <Input 
                value={localPayload.scale_min_label || ''} 
                onChange={(e) => handleFieldChange('scale_min_label', e.target.value)} 
                className="bg-white/10 border-white/20 text-white" 
                placeholder="e.g., 'Low'" 
              />
            </div>
            <div>
              <Label className="text-white/80">Max Label</Label>
              <Input 
                value={localPayload.scale_max_label || ''} 
                onChange={(e) => handleFieldChange('scale_max_label', e.target.value)} 
                className="bg-white/10 border-white/20 text-white" 
                placeholder="e.g., 'High'" 
              />
            </div>
          </div>
        )}

        {(localPayload.question_type === 'text' || localPayload.type === 'text') && (
          <div>
            <Label className="text-white/80">Placeholder Text</Label>
            <Input 
              value={localPayload.placeholder || ''} 
              onChange={(e) => handleFieldChange('placeholder', e.target.value)} 
              className="bg-white/10 border-white/20 text-white" 
              placeholder="e.g., Describe the aromas..." 
            />
          </div>
        )}

        {(localPayload.question_type === 'boolean' || localPayload.type === 'boolean') && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-white/80">True Label</Label>
                <Input 
                  value={localPayload.trueLabel || localPayload.true_label || 'Yes'} 
                  onChange={(e) => {
                    handleFieldChange('trueLabel', e.target.value);
                    handleFieldChange('true_label', e.target.value);
                  }} 
                  className="bg-white/10 border-white/20 text-white" 
                  placeholder="Yes"
                />
              </div>
              <div>
                <Label className="text-white/80">False Label</Label>
                <Input 
                  value={localPayload.falseLabel || localPayload.false_label || 'No'} 
                  onChange={(e) => {
                    handleFieldChange('falseLabel', e.target.value);
                    handleFieldChange('false_label', e.target.value);
                  }} 
                  className="bg-white/10 border-white/20 text-white" 
                  placeholder="No"
                />
              </div>
            </div>
          </div>
        )}

      </CardContent>
    </Card>
  );
}