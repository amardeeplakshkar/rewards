import config from '@payload-config'
import { getPayload, type Payload } from 'payload'

/** Cached Payload instance (Local API). All business logic talks to the database through this. */
export const getPayloadClient = (): Promise<Payload> => getPayload({ config })
