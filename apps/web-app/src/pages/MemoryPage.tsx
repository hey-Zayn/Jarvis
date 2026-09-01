import { FormEvent, useEffect, useState } from 'react';
import { Add, Delete, Psychology, Refresh, Search, Save } from '@mui/icons-material';
import { Alert, Box, Button, Card, CardContent, CardHeader, Chip, CircularProgress, FormControl, InputLabel, MenuItem, Select, Stack, TextField, Typography } from '@mui/material';
import { apiClient } from '@/lib/api';

type MemoryCategory = 'user_preference' | 'fact' | 'task' | 'general';
interface MemoryItem { memoryId: string; content: string; category: MemoryCategory; score?: number; createdAtEpochMillis?: string; }

const categories: Array<{ value: 'all' | MemoryCategory; label: string }> = [
  { value: 'all', label: 'All memories' }, { value: 'user_preference', label: 'Preferences' },
  { value: 'fact', label: 'Facts' }, { value: 'task', label: 'Tasks' }, { value: 'general', label: 'General' },
];

export function MemoryPage() {
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [category, setCategory] = useState<'all' | MemoryCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState<MemoryCategory>('user_preference');
  const [isAdding, setIsAdding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const loadMemories = async (selectedCategory = category) => {
    setIsLoading(true); setError('');
    try {
      const response = await apiClient.listMemories(selectedCategory);
      if (!response.status?.ok) throw new Error(response.status?.message || 'Could not load memories');
      setMemories(response.memories || []);
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not load memories'); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { void loadMemories(); }, [category]);

  const handleSearch = async (event: FormEvent) => {
    event.preventDefault();
    if (!searchQuery.trim()) return loadMemories();
    setIsLoading(true); setError('');
    try {
      const response = await apiClient.searchMemory(searchQuery.trim(), 50);
      if (!response.status?.ok) throw new Error(response.status?.message || 'Search failed');
      setMemories((response.results || []).filter((item: MemoryItem) => category === 'all' || item.category === category));
    } catch (err) { setError(err instanceof Error ? err.message : 'Search failed'); }
    finally { setIsLoading(false); }
  };

  const handleAdd = async (event: FormEvent) => {
    event.preventDefault();
    if (!newContent.trim()) return;
    setIsSaving(true); setError('');
    try {
      const response = await apiClient.saveMemory({ content: newContent.trim(), metadata: { category: newCategory } });
      if (!response.status?.ok) throw new Error(response.status?.message || 'Could not save memory');
      setNewContent(''); setIsAdding(false); await loadMemories();
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not save memory'); }
    finally { setIsSaving(false); }
  };

  const handleDelete = async (memoryId: string) => {
    setBusyId(memoryId); setError('');
    try {
      const response = await apiClient.deleteMemory(memoryId);
      if (!response.status?.ok) throw new Error(response.status?.message || 'Could not delete memory');
      setMemories((current) => current.filter((memory) => memory.memoryId !== memoryId));
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not delete memory'); }
    finally { setBusyId(null); }
  };

  return <Stack spacing={3}>
    <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' } }} spacing={2}>
      <Box><Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.035em' }}>Vector memory</Typography><Typography color="text.secondary" sx={{ mt: 0.75 }}>Facts and preferences Jarvis can retrieve when they are relevant.</Typography></Box>
      <Stack direction="row" spacing={1}><Button variant="outlined" startIcon={<Refresh />} onClick={() => loadMemories()} disabled={isLoading}>Refresh</Button><Button variant="contained" startIcon={<Add />} onClick={() => setIsAdding((open) => !open)}>{isAdding ? 'Close' : 'Add memory'}</Button></Stack>
    </Stack>
    {error && <Alert severity="error">{error}</Alert>}
    {isAdding && <Card><CardHeader title="Save a memory" subheader="Add a specific fact, preference, or task Jarvis should remember." /><CardContent><Box component="form" onSubmit={handleAdd}><Stack spacing={2}><TextField label="Memory content" value={newContent} onChange={(event) => setNewContent(event.target.value)} placeholder="Example: I prefer concise technical answers." multiline minRows={3} fullWidth required autoFocus /><Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'center' } }}><FormControl size="small" sx={{ minWidth: { sm: 210 } }}><InputLabel id="memory-category-label">Category</InputLabel><Select labelId="memory-category-label" value={newCategory} label="Category" onChange={(event) => setNewCategory(event.target.value as MemoryCategory)}>{categories.filter((item) => item.value !== 'all').map((item) => <MenuItem key={item.value} value={item.value}>{item.label}</MenuItem>)}</Select></FormControl><Button type="submit" variant="contained" startIcon={<Save />} disabled={isSaving || !newContent.trim()}>{isSaving ? 'Saving…' : 'Save memory'}</Button></Stack></Stack></Box></CardContent></Card>}
    <Card><CardContent><Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ justifyContent: 'space-between' }}><Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>{categories.map((item) => <Button key={item.value} size="small" variant={category === item.value ? 'contained' : 'outlined'} onClick={() => setCategory(item.value)}>{item.label}</Button>)}</Stack><Box component="form" onSubmit={handleSearch} sx={{ display: 'flex', gap: 1, width: { xs: '100%', md: 330 } }}><TextField size="small" fullWidth value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search by meaning…" slotProps={{ htmlInput: { 'aria-label': 'Search memories by meaning' } }} /><Button type="submit" variant="outlined" aria-label="Search memories" disabled={isLoading}><Search /></Button></Box></Stack></CardContent></Card>
    {isLoading ? <Stack sx={{ alignItems: 'center', py: 8 }}><CircularProgress size={30} /><Typography color="text.secondary" sx={{ mt: 2 }}>Loading memory vault…</Typography></Stack> : memories.length === 0 ? <Card><CardContent><Stack sx={{ alignItems: 'center', py: 6 }} spacing={1}><Psychology color="disabled" sx={{ fontSize: 42 }} /><Typography variant="h6">No memories found</Typography><Typography color="text.secondary">Add a memory or try a different semantic search.</Typography></Stack></CardContent></Card> : <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, gap: 2 }}>{memories.map((memory) => <Card key={memory.memoryId} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}><CardContent sx={{ flex: 1 }}><Stack spacing={2} sx={{ height: '100%', justifyContent: 'space-between' }}><Typography sx={{ lineHeight: 1.7 }}>{memory.content}</Typography><Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}><Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}><Chip size="small" color={memory.category === 'user_preference' ? 'primary' : memory.category === 'fact' ? 'success' : memory.category === 'task' ? 'warning' : 'default'} label={memory.category.replace('_', ' ')} />{memory.score !== undefined && <Typography variant="caption" color="text.secondary">{Math.round(memory.score * 100)}% match</Typography>}</Stack><Button size="small" color="error" startIcon={busyId === memory.memoryId ? <CircularProgress size={14} color="inherit" /> : <Delete />} onClick={() => handleDelete(memory.memoryId)} disabled={busyId === memory.memoryId}>Delete</Button></Stack></Stack></CardContent></Card>)}</Box>}
  </Stack>;
}
