# --
# Kernel/System/Queue.pm - lib for queue funktions
# Copyright (C) 2001-2002 Martin Edenhofer <martin+code@otrs.org>
# --
# $Id: Queue.pm,v 1.9 2002-07-21 17:17:07 martin Exp $
# --
# This software comes with ABSOLUTELY NO WARRANTY. For details, see 
# the enclosed file COPYING for license information (GPL). If you 
# did not receive this file, see http://www.gnu.org/licenses/gpl.txt.
# --

package Kernel::System::Queue;

use strict;

use vars qw($VERSION);
$VERSION = '$Revision: 1.9 $';
$VERSION =~ s/^.*:\s(\d+\.\d+)\s.*$/$1/;

# --
sub new {
    my $Type = shift;
    my %Param = @_;

    # allocate new hash for object
    my $Self = {}; 
    bless ($Self, $Type);

    $Self->{QueueID} = $Param{QueueID} || ''; #die "Got no QueueID!";

    # check needed objects
    foreach (qw(DBObject ConfigObject LogObject)) {
        $Self->{$_} = $Param{$_} || die "Got no $_!";
    }

    return $Self;
}
# --
sub GetSystemAddress {
    my $Self = shift;
    my %Param = @_;
    my %Adresss;
    my $SQL = "SELECT sa.value0, sa.value1 FROM system_address as sa, queue as sq " .
	" WHERE " .
	" sq.id = $Self->{QueueID} " .
	" and " .
	" sa.id = sq.system_address_id";
    $Self->{DBObject}->Prepare(SQL => $SQL);
    while (my @RowTmp = $Self->{DBObject}->FetchrowArray()) {
        $Adresss{Email} = $RowTmp[0];
	$Adresss{RealName} = $RowTmp[1];
    }
    return %Adresss;
}
# --
sub GetSalutation {
    my $Self = shift;
    my %Param = @_;
    my $String = '';
    my $SQL = "SELECT text FROM salutation as sa, queue as sq " .
        " WHERE " .
        " sq.id = $Self->{QueueID} " .
        " and " .
        " sq.salutation_id = sa.id";
    $Self->{DBObject}->Prepare(SQL => $SQL);
    while (my @RowTmp = $Self->{DBObject}->FetchrowArray()) {
        $String = $RowTmp[0];
    }
    return $String;
}
# --
sub GetSignature {
    my $Self = shift;
    my %Param = @_;
    my $String = '';
    my $SQL = "SELECT text FROM signature as si, queue as sq " .
        " WHERE " .
        " sq.id = $Self->{QueueID} " .
        " and " .
        " sq.signature_id = si.id";
    $Self->{DBObject}->Prepare(SQL => $SQL);
    while (my @RowTmp = $Self->{DBObject}->FetchrowArray()) {
        $String = $RowTmp[0];
    }
    return $String;
}
# --
sub GetStdResponse {
    my $Self = shift;
    my %Param = @_;
    my $String = '';
    my $ID = $Param{ID};
    my $SQL = "SELECT text FROM standard_response" .
        " WHERE " .
        " id = $ID ";
    $Self->{DBObject}->Prepare(SQL => $SQL);
    while (my @RowTmp = $Self->{DBObject}->FetchrowArray()) {
        $String = $RowTmp[0];
    }
    return $String;
}
# --
sub GetStdResponses {
    my $Self = shift;
    my %Param = @_;
    my $QueueID = $Param{QueueID} || return;
    my %StdResponses;
    # --
    # check if this result is present
    # --
    if ($Self->{"StdResponses::$QueueID"}) {
        my $StdResponsesTmp = $Self->{"StdResponses::$QueueID"};
        %StdResponses = %$StdResponsesTmp;
        return %StdResponses;
    }
    # --
    # get std. responses
    # --
    my $SQL = "SELECT sr.id, sr.name " .
        " FROM " .
        " standard_response as sr, queue_standard_response as qsr" .
        " WHERE " .
        " qsr.queue_id in ($QueueID)" .
        " AND " .
        " qsr.standard_response_id = sr.id" .
        " AND " .
        " sr.valid_id in ( ${\(join ', ', $Self->{DBObject}->GetValidIDs())} )" .
        " ORDER BY sr.name";
    $Self->{DBObject}->Prepare(SQL => $SQL);
    while (my @RowTmp = $Self->{DBObject}->FetchrowArray()) {
        $StdResponses{$RowTmp[0]} = $RowTmp[1];
    }
    # --
    # store std responses
    # --
    $Self->{"StdResponses::$QueueID"} = \%StdResponses;
    # --
    # return responses
    # --
    return %StdResponses;
}
# --
sub GetAllQueues {
    my $Self = shift;
    my %Param = @_;
    my $UserID = $Param{UserID} || '';
    # fetch all queues
    my %MoveQueues;
    if ($UserID) {
        my $SQL = "SELECT sq.id, sq.name FROM queue as sq, group_user sug, groups as sg " .
        " WHERE " .
        " sug.user_id = $UserID" .
        " AND " .
        " sug.group_id = sg.id" .
        " AND " .
        " sq.group_id = sg.id" .
        " AND " .
        " sq.valid_id in ( ${\(join ', ', $Self->{DBObject}->GetValidIDs())} )";
        $Self->{DBObject}->Prepare(SQL => $SQL);
    }
    else {
        $Self->{DBObject}->Prepare(SQL => "SELECT id, name FROM queue WHERE valid_id in " .
	"( ${\(join ', ', $Self->{DBObject}->GetValidIDs())} )");
    }
    while (my @RowTmp = $Self->{DBObject}->FetchrowArray()) {
        $MoveQueues{$RowTmp[0]} = $RowTmp[1];
    }
    return %MoveQueues;
}
# --
sub GetAllCustomQueues {
    my $Self = shift;
    my %Param = @_;
    my $UserID = $Param{UserID} || '';
    # fetch all queues
    my @QueueIDs;
    my $SQL = "SELECT queue_id FROM personal_queues WHERE user_id = $UserID";
    $Self->{DBObject}->Prepare(SQL => $SQL);
    while (my @RowTmp = $Self->{DBObject}->FetchrowArray()) {
        push(@QueueIDs, $RowTmp[0]);
    }
    return @QueueIDs;
}
# --
sub QueueLookup {
    my $Self = shift;
    my %Param = @_;
    my $Queue = $Param{Queue} || '';
    my $QueueID = $Param{QueueID} || '';

    # check if we ask the same request?
    if (exists $Self->{"QueueLookup$QueueID"}) {
        return $Self->{"QueueLookup$QueueID"};
    }
    if (exists $Self->{"QueueLookup$Queue"}) {
        return $Self->{"QueueLookup$Queue"};
    }

    # get data
    my $SQL = '';
    my $Suffix = '';
    if ($Queue) {
        $Suffix = 'QueueID';
        $SQL = "SELECT id FROM queue WHERE name = '$Queue'";
    }
    else {
        $Suffix = 'Queue';
        $SQL = "SELECT name FROM queue WHERE id = $QueueID";
    }
    $Self->{DBObject}->Prepare(SQL => $SQL);
    while (my @RowTmp = $Self->{DBObject}->FetchrowArray()) {
        # store result
        $Self->{"QueueLookup$Suffix"} = $RowTmp[0];
    }
    # check if data exists
    if (!exists $Self->{"QueueLookup$Suffix"}) {
        print STDERR "Queue->QueueLookup(!\$$Suffix|) \n";
        return;
    }

    return $Self->{"QueueLookup$Suffix"};
}
# --
sub GetFollowUpOption {
    my $Self = shift;
    my %Param = @_;
    my $QueueID = $Param{QueueID} || '';
    # fetch queues data
    my $Return = '';
    my $SQL = "SELECT sf.name " .
		" FROM " .
		" follow_up_possible sf, queue sq " .
		" WHERE " .
		" sq.follow_up_id = sf.id " .
		" AND " .
		" sq.id = $QueueID";
    $Self->{DBObject}->Prepare(SQL => $SQL);
    while (my @RowTmp = $Self->{DBObject}->FetchrowArray()) {
		$Return = $RowTmp[0];
    }
    return $Return;
}
# --
sub GetFollowUpLockOption {
    my $Self = shift;
    my %Param = @_;
    my $QueueID = $Param{QueueID} || '';
    # fetch queues data
    my $Return = 0;
    my $SQL = "SELECT sq.follow_up_lock " .
        " FROM " .
        " queue sq " .
        " WHERE " .
        " sq.id = $QueueID";
    $Self->{DBObject}->Prepare(SQL => $SQL);
    while (my @RowTmp = $Self->{DBObject}->FetchrowArray()) {
        $Return = $RowTmp[0];
    }
    return $Return;
}
# --
sub GetQueueGroupID {
    my $Self = shift;
    my %Param = @_;
    my $QueueID = $Param{QueueID} || return;
    my $GID = '';
        my $SQL = "SELECT group_id " .
        " FROM " .
        " queue " .
        " WHERE " .
        " id = $QueueID";
    $Self->{DBObject}->Prepare(SQL => $SQL);
    while (my @RowTmp = $Self->{DBObject}->FetchrowArray()) {
        $GID = $RowTmp[0];
    }
    return $GID;
}
# --
sub QueueAdd {
   my $Self=shift;
   my %Param = @_;
   # Add Queue to the Database
   
   # Requires
   # Params{GroupID}   : ID of the group responsible for this quese
   # Param{QueueName}  : Duh! Name of the Queue
   # Param{ValidID}    : Is the queue invalid, valid, suspended etc
   # Param{UserID}     : ID of the person creating the Queue

   # Returns 
   # new Queue ID on success
   # null/false on failure

   # ' and , are for modems. Line noise
   # A less noisy way to defining @Params is
   my @Params = qw(
       Name
       GroupID
       UnlockTimeout
       SystemAddressID
       SalutationID
       SignatureID
       FollowUpID
       FollowUpLock
       EscalationTime
       Comment
       ValidID
   );
   

   foreach (@Params) {
       $Param{$_} = $Self->{DBObject}->Quote($Param{$_}) || ''; #Ooooh what does this button do?
   };

   for (qw(UnlockTimeout EscalationTime FollowUpLock SystemAddressID SalutationID SignatureID FollowUpID FollowUpLock)) {
      # these are coming from Config.pm
      # I added default values in the Load Routine
      $Param{$_} = $Self->{ConfigObject}{QueueDefaults}{$_} || 0  unless ($Param{$_});
   };


   my $SQL = "INSERT INTO queue " .
   "(name, " .
       " group_id, " .
       " unlock_timeout, " .
       " system_address_id, " .
       " salutation_id, " .
       " signature_id, " .
       " escalation_time, " .
       " follow_up_id, " .
       " follow_up_lock, " .
       " valid_id, " .
       " comment, " .
       " create_time, " .
       " create_by, " .
       " change_time, " .
       " change_by)" .
       " VALUES " .
       " ('$Param{Name}', " .
       " $Param{GroupID}, " .
       " $Param{UnlockTimeout}, " .
       " $Param{SystemAddressID}, " .
       " $Param{SalutationID}, " .
       " $Param{SignatureID}, " .
       " $Param{EscalationTime}, " .
       " $Param{FollowUpID}, " .
       " $Param{FollowUpLock}, " .
       " $Param{ValidID}, " .
       " '$Param{Comment}', " .
       " current_timestamp, " .
       " $Param{UserID}, " .
       " current_timestamp, " .
       " $Param{UserID})";
   
   if ($Self->{DBObject}->Do(SQL => $SQL)) {
      # --
      # get new queue id
      # --
      
      $SQL = "SELECT id ".
       " FROM " .
       " queue " .
       " WHERE " .
       " name = '$Param{Name}'";
      
      my $QueueID = '';
      $Self->{DBObject}->Prepare(SQL => $SQL);
      while (my @RowTmp = $Self->{DBObject}->FetchrowArray()) {
         $QueueID = $RowTmp[0];
      }
      return $QueueID; 
   }
   else {
      return;
   }
}
#--
sub GetTicketIDsByQueue {
    my $Self = shift;
    my %Param = @_;

    if (!$Param{Queue} && !$Param{QueueID}) {
        print STDERR "Got no Queue or QueueID!\n";
        return;
    }

    my $SQL = "SELECT st.id, st.tn FROM " .
    " ticket as st, queue as sq, ticket_state tsd, ticket_lock_type slt " .
    " WHERE " .
    " st.ticket_state_id = tsd.id " .
    " AND " .
    " st.queue_id = sq.id " .
    " AND " .
    " st.ticket_lock_id = slt.id ";
    if ($Param{States}) { 
        $SQL .= " AND ";
        $SQL .= " tsd.name IN ('${\(join '\', \'' , @{$Param{States}})}') ";
    }
    if ($Param{Locks}) {
        $SQL .= " AND ";
        $SQL .= " slt.name IN ('${\(join '\', \'' , @{$Param{Locks}})}') ";
    }
    $SQL .= " AND ";
    if ($Param{Queue}) {
        $SQL .= " sq.name = '$Param{Queue}' ";
    }
    else {
        $SQL .= " sq.id = '$Param{QueueID}' ";
    }
    my %Tickets = ();
    $Self->{DBObject}->Prepare(SQL => $SQL);
    while (my @RowTmp = $Self->{DBObject}->FetchrowArray()) {
        $Tickets{$RowTmp[0]} = $RowTmp[1];
    }
    return %Tickets;
}   
# --
sub QueueGet {
    my $Self = shift;
    my %Param = @_;
    # --
    # check needed stuff
    # --
    if (!$Param{ID}) {
        $Self->{LogObject}->Log(Priority => 'error', Message => "Need ID!");
        return;
    }
    # --
    # sql 
    # --
     my $SQL = "SELECT name, group_id, unlock_timeout, " .
        " system_address_id, salutation_id, signature_id, comment, valid_id, " .
        " escalation_time, follow_up_id, follow_up_lock " .
        " FROM " .
        " queue " .
        " WHERE " .
        " id = $Param{ID}";
    if ($Self->{DBObject}->Prepare(SQL => $SQL)) {
        my @Data = $Self->{DBObject}->FetchrowArray();
        my %QueueData = (
            QueueID => $Param{ID},
            Name => $Data[0],
            GroupID => $Data[1],
            UnlockTimeout => $Data[2],
            EscalationTime => $Data[8],
            FollowUpID => $Data[9],
            FollowUpLock => $Data[10],
            SystemAddressID => $Data[3],
            SalutationID => $Data[4],
            SignatureID => $Data[5],
            Comment => $Data[6],
            ValidID => $Data[7],
        );
        return %QueueData;
    }
    else {
        return;
    }
}
# --
sub QueueUpdate {
    my $Self = shift;
    my %Param = @_;
    # --
    # check needed stuff
    # --
    foreach (qw(QueueID Name ValidID GroupID SystemAddressID SalutationID SignatureID UserID)) {
      if (!$Param{$_}) {
        $Self->{LogObject}->Log(Priority => 'error', Message => "Need $_!");
        return;
      }
    }
    # --
    # db quote
    # --
    foreach (keys %Param) {
        $Param{$_} = $Self->{DBObject}->Quote($Param{$_}) || '';
    }
    # check !!!
    $Param{UnlockTimeout} = 0 if (!$Param{UnlockTimeout});
    $Param{EscalationTime} = 0 if (!$Param{EscalationTime});
    $Param{FollowUpLock} = 0 if (!$Param{FollowUpLock});
    # --
    # sql
    # --
    my $SQL = "UPDATE queue SET name = '$Param{Name}', " .
        " comment = '$Param{Comment}', " .
        " group_id = $Param{GroupID}, " .
        " unlock_timeout = $Param{UnlockTimeout}, " .
        " escalation_time = $Param{EscalationTime}, " .
        " follow_up_id = $Param{FollowUpID}, " .
        " follow_up_lock = $Param{FollowUpLock}, " .
        " system_address_id = $Param{SystemAddressID}, " .
        " salutation_id = $Param{SalutationID}, " .
        " signature_id = $Param{SignatureID}, " .
        " valid_id = $Param{ValidID}, " .
        " change_time = current_timestamp, " .
        " change_by = $Param{UserID} " .
        " WHERE id = $Param{QueueID}";
    if ($Self->{DBObject}->Do(SQL => $SQL)) {
        return 1;
    }
    else {
        return;
    }
}
# --

1;
