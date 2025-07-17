import { NextRequest, NextResponse } from 'next/server';
import { EmailService } from '@/services/email';
import { supabase } from '@/services/supabaseClient';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { invitationToken } = body;

    if (!invitationToken) {
      return NextResponse.json(
        { error: 'Invitation token is required' },
        { status: 400 }
      );
    }

    // Get invitation details from database
    const { data: invitationData, error: invitationError } = await supabase
      .rpc('get_invitation_by_token', { invitation_token: invitationToken });

    if (invitationError) {
      console.error('Error fetching invitation:', invitationError);
      return NextResponse.json(
        { error: 'Failed to fetch invitation details' },
        { status: 500 }
      );
    }

    if (!invitationData?.success) {
      return NextResponse.json(
        { error: invitationData?.error || 'Invalid invitation token' },
        { status: 400 }
      );
    }

    const invitation = invitationData.invitation;

    // Prepare email data
    const emailData = {
      invitedEmail: invitation.email,
      invitedByName: invitation.invited_by_user?.name || invitation.invited_by_user?.email || 'Sistema',
      invitedByEmail: invitation.invited_by_user?.email || 'noreply@sistema.com',
      organizationName: invitation.organization.name,
      invitationToken: invitationToken,
      expiresAt: invitation.expires_at,
      role: invitation.role
    };

    // Send email
    const emailResult = await EmailService.sendInvitationEmail(emailData);

    if (!emailResult.success) {
      return NextResponse.json(
        { error: emailResult.error || 'Failed to send invitation email' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Invitation email sent successfully'
    });

  } catch (error) {
    console.error('Error in send-email API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}