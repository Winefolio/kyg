// client/src/components/editor/QuestionConfigForm.tsx

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, PlusCircle } from 'lucide-react';

interface QuestionConfigFormProps {
  payload: any;
  onPayloadChange: (newPayload: any) => void;
}

export function QuestionConfigForm({ payload, onPayloadChange }: QuestionConfigFormProps) {
  
  const handleFieldChange = (field: string, value: any) => {
    onPayloadChange({ ...payload, [field]: value });
  };

  const handleOptionChange = (index: number, field: string, value: string) => {
    const newOptions = [...(payload.options || [])];
    newOptions[index] = { ...newOptions[index], [field]: value };
    handleFieldChange('options', newOptions);
  };

  const addOption = () => {
    const newValue = `option_${Date.now()}`;
    const newOptions = [...(payload.options || []), { text: '', description: '', value: newValue }];
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
        <div className="mb-4 p-2 bg-blue-500/20 text-blue-200 text-xs">
          Debug QuestionConfigForm: question_type = "{payload.question_type}", payload = {JSON.stringify(payload, null, 2)}
        </div>
        
        <div>
          <Label className="text-white/80">Question Text</Label>
          <Input 
            value={payload.question || ''} 
            onChange={(e) => handleFieldChange('question', e.target.value)} 
            className="bg-white/10 border-white/20 text-white" 
            placeholder="Enter your question here..."
          />
        </div>

        <div>
          <Label className="text-white/80">Question Type</Label>
          <Select value={payload.question_type || 'multiple_choice'} onValueChange={(value) => handleFieldChange('question_type', value)}>
            <SelectTrigger className="bg-white/10 border-white/20 text-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
              <SelectItem value="scale">Scale Rating</SelectItem>
              <SelectItem value="text">Text Input</SelectItem>
              <SelectItem value="boolean">Yes/No</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {payload.question_type === 'multiple_choice' && (
          <div className="space-y-4">
            <Label className="text-white/80">Answer Options</Label>
            {payload.options?.map((option: any, index: number) => (
              <div key={option.value || option.text || index} className="p-3 bg-black/20 rounded-lg border border-white/10 space-y-2">
                <div className="flex justify-between items-center">
                  <Label className="text-white/70 text-sm">Option {index + 1}</Label>
                  <Button size="icon" variant="ghost" onClick={() => removeOption(index)} className="h-7 w-7 text-red-400 hover:bg-red-500/20"><Trash2 className="h-4 w-4" /></Button>
                </div>
                <Input value={option.text || ''} onChange={(e) => handleOptionChange(index, 'text', e.target.value)} className="bg-white/10 border-white/20 text-white" placeholder="Option Text" />
                <Input value={option.description || ''} onChange={(e) => handleOptionChange(index, 'description', e.target.value)} className="bg-white/10 border-white/20 text-white text-xs" placeholder="Option Description (optional)" />
              </div>
            ))}
            <Button onClick={addOption} variant="outline" className="w-full border-dashed"><PlusCircle className="mr-2 h-4 w-4" /> Add Option</Button>
          </div>
        )}

        {payload.question_type === 'scale' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-white/80">Min Value</Label><Input type="number" value={payload.scale_min || 1} onChange={(e) => handleFieldChange('scale_min', parseInt(e.target.value))} className="bg-white/10 border-white/20 text-white" /></div>
              <div><Label className="text-white/80">Max Value</Label><Input type="number" value={payload.scale_max || 10} onChange={(e) => handleFieldChange('scale_max', parseInt(e.target.value))} className="bg-white/10 border-white/20 text-white" /></div>
            </div>
            <div><Label className="text-white/80">Min Label</Label><Input value={payload.scale_min_label || ''} onChange={(e) => handleFieldChange('scale_min_label', e.target.value)} className="bg-white/10 border-white/20 text-white" placeholder="e.g., 'Low'" /></div>
            <div><Label className="text-white/80">Max Label</Label><Input value={payload.scale_max_label || ''} onChange={(e) => handleFieldChange('scale_max_label', e.target.value)} className="bg-white/10 border-white/20 text-white" placeholder="e.g., 'High'" /></div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}