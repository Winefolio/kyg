// client/src/components/editor/QuestionConfigForm.tsx
import React, { useEffect, useMemo } from 'react';
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

export function QuestionConfigForm({ payload, onPayloadChange }: QuestionConfigFormProps) {
  const questionType = payload.question_type || payload.type || 'multiple_choice';

  // Initialize options when changing to multiple choice
  useEffect(() => {
    if (questionType === 'multiple_choice' && (!payload.options || payload.options.length === 0)) {
      onPayloadChange({
        ...payload,
        options: [
          { value: 'option1', text: 'Option 1', description: '' },
          { value: 'option2', text: 'Option 2', description: '' }
        ]
      });
    }
  }, [questionType]);

  // Safeguard: Ensure multiple choice questions always have options displayed
  const displayOptions = useMemo(() => {
    if (questionType === 'multiple_choice') {
      const currentOptions = payload.options || [];
      if (currentOptions.length === 0) {
        return [
          { value: 'option1', text: 'Option 1', description: '' },
          { value: 'option2', text: 'Option 2', description: '' }
        ];
      }
      return currentOptions;
    }
    return payload.options || [];
  }, [questionType, payload.options]);

  const handleFieldChange = (field: string, value: any) => {
    onPayloadChange({ ...payload, [field]: value });
  };

  const handleOptionChange = (index: number, field: string, value: string) => {
    const newOptions = [...(payload.options || [])];
    newOptions[index] = { ...newOptions[index], [field]: value };
    handleFieldChange('options', newOptions);
  };

  const addOption = () => {
    // Correctly add a unique value to each new option
    const newOptions = [...(payload.options || []), { text: '', description: '', value: `option_${Date.now()}` }];
    handleFieldChange('options', newOptions);
  };

  const removeOption = (index: number) => {
    const newOptions = (payload.options || []).filter((_: any, i: number) => i !== index);
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
          <Select value={payload.question_type || payload.type || 'multiple_choice'} onValueChange={(value) => {
            handleFieldChange('question_type', value);
            handleFieldChange('type', value); // Also update type field for backward compatibility
            
            // Immediately initialize default options when switching to multiple choice
            if (value === 'multiple_choice' && (!payload.options || payload.options.length === 0)) {
              onPayloadChange({
                ...payload,
                question_type: value,
                type: value,
                options: [
                  { value: 'option1', text: 'Option 1', description: '' },
                  { value: 'option2', text: 'Option 2', description: '' }
                ]
              });
            } else if (value === 'boolean' && (!payload.trueLabel && !payload.falseLabel)) {
              // Initialize boolean question defaults
              onPayloadChange({
                ...payload,
                question_type: value,
                type: value,
                trueLabel: 'Yes',
                falseLabel: 'No'
              });
            } else if ((value === 'scale' || value === 'slider') && (!payload.scale_min && !payload.scale_max)) {
              // Initialize scale question defaults
              onPayloadChange({
                ...payload,
                question_type: value,
                type: value,
                scale_min: 1,
                scale_max: 10,
                scale_labels: ['Low', 'High']
              });
            }
          }}>
            <SelectTrigger className="bg-white/10 border-white/20 text-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
              <SelectItem value="scale">Scale Rating</SelectItem>
              <SelectItem value="slider">Scale Rating</SelectItem>
              <SelectItem value="text">Text Input</SelectItem>
              <SelectItem value="boolean">Yes/No</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {(payload.question_type === 'multiple_choice' || payload.type === 'multiple_choice') && (
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
                    <Switch id="allow_multiple" checked={payload.allow_multiple || false} onCheckedChange={(checked) => handleFieldChange('allow_multiple', checked)} />
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

        {(payload.question_type === 'scale' || payload.question_type === 'slider' || payload.type === 'scale' || payload.type === 'slider') && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-white/80">Min Value</Label>
                <Input 
                  type="number" 
                  value={payload.scale_min || payload.min || 1} 
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
                  value={payload.scale_max || payload.max || 10} 
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
                value={payload.step || 1} 
                onChange={(e) => handleFieldChange('step', parseInt(e.target.value))} 
                className="bg-white/10 border-white/20 text-white" 
                placeholder="1"
              />
            </div>
            <div>
              <Label className="text-white/80">Min Label</Label>
              <Input 
                value={payload.scale_min_label || ''} 
                onChange={(e) => handleFieldChange('scale_min_label', e.target.value)} 
                className="bg-white/10 border-white/20 text-white" 
                placeholder="e.g., 'Low'" 
              />
            </div>
            <div>
              <Label className="text-white/80">Max Label</Label>
              <Input 
                value={payload.scale_max_label || ''} 
                onChange={(e) => handleFieldChange('scale_max_label', e.target.value)} 
                className="bg-white/10 border-white/20 text-white" 
                placeholder="e.g., 'High'" 
              />
            </div>
          </div>
        )}

        {(payload.question_type === 'text' || payload.type === 'text') && (
          <div>
            <Label className="text-white/80">Placeholder Text</Label>
            <Input 
              value={payload.placeholder || ''} 
              onChange={(e) => handleFieldChange('placeholder', e.target.value)} 
              className="bg-white/10 border-white/20 text-white" 
              placeholder="e.g., Describe the aromas..." 
            />
          </div>
        )}

      </CardContent>
    </Card>
  );
}