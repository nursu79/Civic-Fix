import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface Params {
  params: Promise<{ id: string }>;
}

// POST /api/issues/[id]/upvote - Toggle upvote
export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  
  // Check auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // Check if already upvoted
  const { data: existingUpvote } = await supabase
    .from('upvotes')
    .select('id')
    .eq('issue_id', id)
    .eq('user_id', user.id)
    .single() as { data: { id: string } | null };
  
  if (existingUpvote) {
    // Remove upvote
    const { error } = await supabase
      .from('upvotes')
      .delete()
      .eq('id', existingUpvote.id);
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ upvoted: false });
  } else {
    // Add upvote
    const upvoteData = {
      issue_id: id,
      user_id: user.id,
    };
    const { error } = await supabase
      .from('upvotes')
      .insert(upvoteData as any);
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ upvoted: true });
  }
}
