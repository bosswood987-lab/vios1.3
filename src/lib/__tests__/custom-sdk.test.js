import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the supabase client import
vi.mock('../supabase-client.js', () => ({
  supabase: {
    from: vi.fn((table) => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { id: '1', name: 'test' }, error: null })),
          maybeSingle: vi.fn(() => Promise.resolve({ data: { id: '1', name: 'test' }, error: null }))
        })),
        order: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve({ data: [{ id: '1', name: 'test' }], error: null }))
        })),
        limit: vi.fn(() => Promise.resolve({ data: [{ id: '1', name: 'test' }], error: null })),
        in: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve({ data: [{ id: '1', name: 'test' }], error: null }))
          }))
        }))
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { id: '1', name: 'test' }, error: null }))
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            maybeSingle: vi.fn(() => Promise.resolve({ data: { id: '1', name: 'updated' }, error: null }))
          }))
        }))
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null }))
      }))
    })),
    auth: {
      getUser: vi.fn(() => Promise.resolve({ 
        data: { user: { id: '1', email: 'test@example.com' } }, 
        error: null 
      })),
      signOut: vi.fn(() => Promise.resolve({ error: null }))
    }
  }
}))

// Mock createClient for service role
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn((table) => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { id: '1', name: 'test' }, error: null })),
          maybeSingle: vi.fn(() => Promise.resolve({ data: { id: '1', name: 'test' }, error: null }))
        })),
        order: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve({ data: [{ id: '1', name: 'test' }], error: null }))
        })),
        limit: vi.fn(() => Promise.resolve({ data: [{ id: '1', name: 'test' }], error: null })),
        in: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve({ data: [{ id: '1', name: 'test' }], error: null }))
          }))
        }))
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { id: '1', name: 'test' }, error: null }))
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            maybeSingle: vi.fn(() => Promise.resolve({ data: { id: '1', name: 'updated' }, error: null }))
          }))
        }))
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null }))
      }))
    })),
    auth: {
      getUser: vi.fn(() => Promise.resolve({ 
        data: { user: { id: '1', email: 'test@example.com' } }, 
        error: null 
      })),
      signOut: vi.fn(() => Promise.resolve({ error: null }))
    }
  }))
}))

import { CustomEntity, UserEntity } from '../custom-sdk.js'

describe('CustomEntity', () => {
  let entity
  let mockSupabase

  beforeEach(async () => {
    // Get the mocked supabase client
    const { supabase } = await import('../supabase-client.js')
    mockSupabase = supabase
    
    entity = new CustomEntity('test_table')
    vi.clearAllMocks()
  })

  it('should list records', async () => {
    // Mock the chain properly - the query object itself needs to be awaitable
    const mockQuery = {
      order: vi.fn(function() { return this }),
      limit: vi.fn(function() { return this }),
      then: vi.fn((resolve) => resolve({ data: [{ id: '1', name: 'test' }], error: null }))
    }
    
    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn(() => mockQuery)
    })
    
    const result = await entity.list()
    
    expect(mockSupabase.from).toHaveBeenCalledWith('test_table')
    expect(result).toEqual([{ id: '1', name: 'test' }])
  })

  it('should handle ordering', async () => {
    await entity.list('-created_at')
    
    expect(mockSupabase.from).toHaveBeenCalledWith('test_table')
  })

  it('should filter records', async () => {
    // Mock the chain properly for filter
    const mockQuery = {
      eq: vi.fn(() => mockQuery),
      order: vi.fn(() => ({
        limit: vi.fn(() => Promise.resolve({ data: [{ id: '1', name: 'test' }], error: null }))
      })),
      limit: vi.fn(() => Promise.resolve({ data: [{ id: '1', name: 'test' }], error: null }))
    }
    
    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn(() => mockQuery)
    })
    
    await entity.filter({ status: 'active' })
    
    expect(mockSupabase.from).toHaveBeenCalledWith('test_table')
  })

  it('should get single record', async () => {
    const result = await entity.get('1')
    
    expect(mockSupabase.from).toHaveBeenCalledWith('test_table')
    expect(result).toEqual({ id: '1', name: 'test' })
  })

  it('should create record', async () => {
    const newData = { name: 'test' }
    const result = await entity.create(newData)
    
    expect(mockSupabase.from).toHaveBeenCalledWith('test_table')
    expect(result).toEqual({ id: '1', name: 'test' })
  })

  it('should update record', async () => {
    const updateData = { name: 'updated' }
    const result = await entity.update('1', updateData)
    
    expect(mockSupabase.from).toHaveBeenCalledWith('test_table')
    expect(result).toEqual({ id: '1', name: 'updated' })
  })

  it('should delete record', async () => {
    await entity.delete('1')
    
    expect(mockSupabase.from).toHaveBeenCalledWith('test_table')
  })

  it('should map field names correctly', () => {
    expect(entity.mapFieldName('created_date')).toBe('created_at')
    expect(entity.mapFieldName('updated_date')).toBe('updated_at')
    expect(entity.mapFieldName('other_field')).toBe('other_field')
  })

  it('should map data fields', () => {
    const data = { created_date: '2023-01-01', name: 'test' }
    const mapped = entity.mapDataFields(data)
    
    expect(mapped).toEqual({ created_at: '2023-01-01', name: 'test' })
  })

  it('should map result fields', () => {
    const data = { created_at: '2023-01-01', name: 'test' }
    const mapped = entity.mapResultFields(data)
    
    expect(mapped).toEqual({ created_date: '2023-01-01', name: 'test' })
  })

  it('should handle missing table gracefully', async () => {
    // Mock error response for missing table
    const mockFromWithError = vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve({
            data: null,
            error: {
              code: 'PGRST205',
              message: 'Could not find the table test_table'
            }
          }))
        }))
      }))
    }))

    mockSupabase.from = mockFromWithError

    const result = await entity.list()
    expect(result).toEqual([])
  })
})

describe('UserEntity', () => {
  let userEntity
  let mockSupabase

  beforeEach(async () => {
    // Get the mocked supabase client
    const { supabase } = await import('../supabase-client.js')
    mockSupabase = supabase
    
    userEntity = new UserEntity()
    vi.clearAllMocks()
  })

  it('should get current user', async () => {
    // Mock successful auth and user data
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: '1', email: 'test@example.com' } },
      error: null
    })

    const result = await userEntity.me()
    
    expect(mockSupabase.auth.getUser).toHaveBeenCalled()
    expect(result).toEqual({ id: '1', name: 'test' })
  })

  it('should update user data', async () => {
    // Mock successful auth
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: '1', email: 'test@example.com' } },
      error: null
    })

    const updateData = { name: 'updated' }
    const result = await userEntity.updateMyUserData(updateData)
    
    expect(mockSupabase.auth.getUser).toHaveBeenCalled()
    expect(result).toEqual({ id: '1', name: 'updated' })
  })

  it('should check authentication', async () => {
    const result = await userEntity.isAuthenticated()
    
    expect(mockSupabase.auth.getUser).toHaveBeenCalled()
    expect(result).toBe(true)
  })

  it('should handle authentication errors gracefully', async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: 'Auth session missing' }
    })

    const result = await userEntity.isAuthenticated()
    expect(result).toBe(false)
  })

  it('should get current user or return null', async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: 'Not authenticated' }
    })

    const result = await userEntity.getCurrentUser()
    expect(result).toBe(null)
  })
})

describe('Universal Entity Discovery', () => {
  it('should convert PascalCase to snake_case', async () => {
    // Test the entityNameToTableName function indirectly
    const { createCustomClient } = await import('../custom-sdk.js')
    const client = createCustomClient()
    
    // Access an entity to trigger creation
    const blogPost = client.entities.BlogPost
    expect(blogPost.tableName).toBe('blog_post')
    
    const userMembership = client.entities.UserMembership
    expect(userMembership.tableName).toBe('user_membership')
  })

  it('should detect service role entities', async () => {
    const { createCustomClient } = await import('../custom-sdk.js')
    const client = createCustomClient()
    
    // These should use service role
    const user = client.entities.User
    expect(user.useServiceRole).toBe(true)
    
    const transaction = client.entities.Transaction
    expect(transaction.useServiceRole).toBe(true)
    
    // This should not use service role
    const product = client.entities.Product
    expect(product.useServiceRole).toBe(false)
  })

  it('should cache entities for performance', async () => {
    const { createCustomClient } = await import('../custom-sdk.js')
    const client = createCustomClient()
    
    const entity1 = client.entities.TestEntity
    const entity2 = client.entities.TestEntity
    
    // Should return the same cached instance
    expect(entity1).toBe(entity2)
  })
})

describe('Integration Functions', () => {
  it('should provide placeholder for InvokeLLM', async () => {
    const { createCustomClient } = await import('../custom-sdk.js')
    const client = createCustomClient()
    
    const result = await client.integrations.Core.InvokeLLM({
      prompt: 'Test prompt',
      response_json_schema: { type: 'object' }
    })
    
    expect(result.data).toBeDefined()
    expect(result.data.note).toContain('not yet implemented')
  })

  it('should provide placeholder for SendEmail', async () => {
    const { createCustomClient } = await import('../custom-sdk.js')
    const client = createCustomClient()
    
    const result = await client.integrations.Core.SendEmail({
      to: 'test@example.com',
      subject: 'Test',
      body: 'Test body'
    })
    
    expect(result.status).toBe('sent')
    expect(result.message_id).toBeDefined()
    expect(result.note).toContain('not yet implemented')
  })

  it('should provide placeholder for UploadFile', async () => {
    const { createCustomClient } = await import('../custom-sdk.js')
    const client = createCustomClient()
    
    const mockFile = { name: 'test.jpg', size: 1024, type: 'image/jpeg' }
    const result = await client.integrations.Core.UploadFile({ file: mockFile })
    
    expect(result.file_url).toBeDefined()
    expect(result.note).toContain('not yet implemented')
  })

  it('should provide placeholder for GenerateImage', async () => {
    const { createCustomClient } = await import('../custom-sdk.js')
    const client = createCustomClient()
    
    const result = await client.integrations.Core.GenerateImage({
      prompt: 'A beautiful sunset'
    })
    
    expect(result.url).toBeDefined()
    expect(result.note).toContain('not yet implemented')
  })

  it('should provide placeholder for ExtractDataFromUploadedFile', async () => {
    const { createCustomClient } = await import('../custom-sdk.js')
    const client = createCustomClient()
    
    const result = await client.integrations.Core.ExtractDataFromUploadedFile({
      file_url: 'https://example.com/file.pdf',
      json_schema: { type: 'object' }
    })
    
    expect(result.status).toBe('success')
    expect(result.note).toContain('not yet implemented')
  })
})

describe('Custom Functions', () => {
  it('should provide placeholder for verifyHcaptcha', async () => {
    const { createCustomClient } = await import('../custom-sdk.js')
    const client = createCustomClient()
    
    const result = await client.functions.verifyHcaptcha()
    
    expect(result.success).toBe(true)
  })
})

describe('Base44 Client Export', () => {
  it('should export the custom client as base44', async () => {
    const { base44 } = await import('../../api/base44Client.js')
    
    expect(base44).toBeDefined()
    expect(base44.entities).toBeDefined()
    expect(base44.auth).toBeDefined()
    expect(base44.functions).toBeDefined()
    expect(base44.integrations).toBeDefined()
  })
})

describe('Supabase Client', () => {
  it('should create supabase client with environment variables', async () => {
    const { supabase } = await import('../supabase-client.js')
    
    expect(supabase).toBeDefined()
    // Note: In a real test environment, you'd mock the createClient function
  })
})

describe('Error Handling', () => {
  it('should handle authentication errors in UserEntity.me()', async () => {
    const { supabase } = await import('../supabase-client.js')
    const mockSupabase = supabase
    
    // Mock auth error
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: 'User from sub claim in JWT does not exist' }
    })
    
    const userEntity = new UserEntity()
    
    await expect(userEntity.me()).rejects.toThrow('Not authenticated')
  })

  it('should handle missing table errors gracefully', async () => {
    const entity = new CustomEntity('nonexistent_table')
    const { supabase } = await import('../supabase-client.js')
    const mockSupabase = supabase
    
    // Mock table not found error
    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn(() => ({
        order: vi.fn(() => ({
          then: vi.fn((resolve) => resolve({
            data: null,
            error: {
              code: 'PGRST205',
              message: 'Could not find the table nonexistent_table'
            }
          }))
        }))
      }))
    })
    
    const result = await entity.list()
    expect(result).toEqual([])
  })

  it('should handle update with no matching records', async () => {
    const entity = new CustomEntity('test_table')
    const { supabase } = await import('../supabase-client.js')
    const mockSupabase = supabase
    
    // Mock no records updated
    mockSupabase.from.mockReturnValueOnce({
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null }))
          }))
        }))
      }))
    })
    
    const result = await entity.update('nonexistent-id', { name: 'test' })
    expect(result).toBe(null)
  })
})