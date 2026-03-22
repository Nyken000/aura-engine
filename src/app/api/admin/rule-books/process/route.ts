import { NextRequest, NextResponse } from 'next/server'
import { processRuleBookIndexing } from '@/server/rag/rule-book-indexer'
import { isAdmin } from '@/utils/auth/roles'
import { createClient as createServerClient } from '@/utils/supabase/server'
import { createServiceClient } from '@/utils/supabase/service'

function isProcessorSecretValid(request: NextRequest): boolean {
    const configuredSecret = process.env.RULE_BOOK_PROCESSOR_SECRET?.trim()
    if (!configuredSecret) return false

    const providedSecret = request.headers.get('x-rule-book-processor-secret')?.trim()
    return providedSecret === configuredSecret
}

export async function POST(request: NextRequest) {
    try {
        const body = (await request.json().catch(() => null)) as { ruleBookId?: string } | null
        const ruleBookId = body?.ruleBookId?.trim()

        if (!ruleBookId) {
            return NextResponse.json({ error: 'ruleBookId es obligatorio.' }, { status: 400 })
        }

        const useServiceClient = isProcessorSecretValid(request)
        const supabase = useServiceClient ? createServiceClient() : await createServerClient()

        if (!useServiceClient && !(await isAdmin())) {
            return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })
        }

        const result = await processRuleBookIndexing({
            supabase,
            ruleBookId,
        })

        return NextResponse.json({ success: true, ...result })
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Error desconocido al procesar el manual.'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}