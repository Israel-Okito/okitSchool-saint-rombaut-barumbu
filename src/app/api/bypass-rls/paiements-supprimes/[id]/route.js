import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function DELETE(request, { params }) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    const { id } = await  params;

    // Vérifier que l'ID est un nombre valide
    if (!id || isNaN(id)) {
      return NextResponse.json(
        { error: 'ID de paiement invalide' },
        { status: 400 }
      );
    }

    // Appeler la fonction RPC pour supprimer le paiement
    const { data, error } = await supabase
      .rpc('rpc_delete_paiement_supprime', {
        paiement_id: parseInt(id)
      });

    if (error) {
      console.error('Erreur lors de la suppression du paiement:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, message: 'Paiement supprimé définitivement' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Erreur lors de la suppression du paiement:', error);
    return NextResponse.json(
      { error: 'Une erreur est survenue lors de la suppression du paiement' },
      { status: 500 }
    );
  }
} 