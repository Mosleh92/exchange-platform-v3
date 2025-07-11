const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

/**
 * Enhanced Swagger Configuration
 * Comprehensive API documentation for the Exchange Platform
 */
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Exchange Platform API v3',
      version: '3.0.0',
      description: `
        # Exchange Platform API Documentation
        
        ## Overview
        Comprehensive multi-tenant exchange platform with P2P trading, remittance, and financial services.
        
        ## Authentication
        All API endpoints require JWT authentication. Include the token in the Authorization header:
        \`Authorization: Bearer <your-jwt-token>\`
        
        ## Multi-Tenancy
        All endpoints are tenant-aware. Include tenant ID in headers:
        \`X-Tenant-ID: <tenant-id>\`
        
        ## Rate Limiting
        API requests are rate-limited per tenant and user. Check response headers for limits.
        
        ## Error Handling
        All errors return consistent JSON format with error codes and messages.
      `,
      contact: {
        name: 'Exchange Platform Support',
        email: 'support@exchangeplatform.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: process.env.API_BASE_URL || 'http://localhost:3000',
        description: 'Development server'
      },
      {
        url: 'https://api.exchangeplatform.com',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token for authentication'
        },
        tenantAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-Tenant-ID',
          description: 'Tenant ID for multi-tenancy'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error type'
            },
            message: {
              type: 'string',
              description: 'Error message'
            },
            details: {
              type: 'object',
              description: 'Additional error details'
            },
            code: {
              type: 'string',
              description: 'Error code'
            }
          }
        },
        Transaction: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'Transaction ID'
            },
            userId: {
              type: 'string',
              description: 'User ID'
            },
            tenantId: {
              type: 'string',
              description: 'Tenant ID'
            },
            fromAccountId: {
              type: 'string',
              description: 'Source account ID'
            },
            toAccountId: {
              type: 'string',
              description: 'Destination account ID'
            },
            amount: {
              type: 'number',
              description: 'Transaction amount'
            },
            currency: {
              type: 'string',
              description: 'Transaction currency'
            },
            transactionType: {
              type: 'string',
              enum: ['TRANSFER', 'EXCHANGE', 'PAYMENT', 'P2P', 'REMITTANCE'],
              description: 'Transaction type'
            },
            status: {
              type: 'string',
              enum: ['PENDING', 'COMPLETED', 'FAILED', 'CANCELLED', 'ROLLED_BACK'],
              description: 'Transaction status'
            },
            description: {
              type: 'string',
              description: 'Transaction description'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp'
            }
          }
        },
        Account: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'Account ID'
            },
            userId: {
              type: 'string',
              description: 'User ID'
            },
            tenantId: {
              type: 'string',
              description: 'Tenant ID'
            },
            accountType: {
              type: 'string',
              enum: ['CHECKING', 'SAVINGS', 'TRADING', 'ESCROW'],
              description: 'Account type'
            },
            currency: {
              type: 'string',
              description: 'Account currency'
            },
            balance: {
              type: 'number',
              description: 'Current balance'
            },
            status: {
              type: 'string',
              enum: ['ACTIVE', 'SUSPENDED', 'CLOSED'],
              description: 'Account status'
            }
          }
        },
        P2PAnnouncement: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'Announcement ID'
            },
            userId: {
              type: 'string',
              description: 'User ID'
            },
            tenantId: {
              type: 'string',
              description: 'Tenant ID'
            },
            fromCurrency: {
              type: 'string',
              description: 'Source currency'
            },
            toCurrency: {
              type: 'string',
              description: 'Destination currency'
            },
            rate: {
              type: 'number',
              description: 'Exchange rate'
            },
            minAmount: {
              type: 'number',
              description: 'Minimum trade amount'
            },
            maxAmount: {
              type: 'number',
              description: 'Maximum trade amount'
            },
            status: {
              type: 'string',
              enum: ['ACTIVE', 'INACTIVE', 'COMPLETED', 'CANCELLED'],
              description: 'Announcement status'
            },
            location: {
              type: 'string',
              description: 'Trade location'
            },
            paymentMethods: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Accepted payment methods'
            }
          }
        },
        User: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'User ID'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email'
            },
            firstName: {
              type: 'string',
              description: 'First name'
            },
            lastName: {
              type: 'string',
              description: 'Last name'
            },
            role: {
              type: 'string',
              enum: ['user', 'admin', 'super_admin'],
              description: 'User role'
            },
            status: {
              type: 'string',
              enum: ['ACTIVE', 'SUSPENDED', 'PENDING'],
              description: 'User status'
            },
            tenantId: {
              type: 'string',
              description: 'Tenant ID'
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: [],
        tenantAuth: []
      }
    ]
  },
  apis: [
    './src/routes/*.js',
    './src/controllers/*.js',
    './src/models/*.js'
  ]
};

/**
 * Swagger documentation for authentication endpoints
 */
const authDocs = {
  '/auth/login': {
    post: {
      tags: ['Authentication'],
      summary: 'User login',
      description: 'Authenticate user and return JWT token',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['email', 'password'],
              properties: {
                email: {
                  type: 'string',
                  format: 'email',
                  description: 'User email'
                },
                password: {
                  type: 'string',
                  description: 'User password'
                },
                tenantId: {
                  type: 'string',
                  description: 'Tenant ID'
                }
              }
            }
          }
        }
      },
      responses: {
        200: {
          description: 'Login successful',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  token: {
                    type: 'string',
                    description: 'JWT token'
                  },
                  user: {
                    $ref: '#/components/schemas/User'
                  }
                }
              }
            }
          }
        },
        401: {
          description: 'Authentication failed',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              }
            }
          }
        }
      }
    }
  },
  '/auth/register': {
    post: {
      tags: ['Authentication'],
      summary: 'User registration',
      description: 'Register new user account',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['email', 'password', 'firstName', 'lastName'],
              properties: {
                email: {
                  type: 'string',
                  format: 'email',
                  description: 'User email'
                },
                password: {
                  type: 'string',
                  description: 'User password'
                },
                firstName: {
                  type: 'string',
                  description: 'First name'
                },
                lastName: {
                  type: 'string',
                  description: 'Last name'
                },
                phone: {
                  type: 'string',
                  description: 'Phone number'
                },
                tenantId: {
                  type: 'string',
                  description: 'Tenant ID'
                }
              }
            }
          }
        }
      },
      responses: {
        201: {
          description: 'User registered successfully',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/User'
              }
            }
          }
        },
        400: {
          description: 'Validation error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              }
            }
          }
        }
      }
    }
  }
};

/**
 * Swagger documentation for transaction endpoints
 */
const transactionDocs = {
  '/transactions': {
    get: {
      tags: ['Transactions'],
      summary: 'Get user transactions',
      description: 'Retrieve paginated list of user transactions',
      security: [
        {
          bearerAuth: [],
          tenantAuth: []
        }
      ],
      parameters: [
        {
          name: 'page',
          in: 'query',
          schema: {
            type: 'integer',
            default: 1
          },
          description: 'Page number'
        },
        {
          name: 'limit',
          in: 'query',
          schema: {
            type: 'integer',
            default: 20
          },
          description: 'Items per page'
        },
        {
          name: 'status',
          in: 'query',
          schema: {
            type: 'string',
            enum: ['PENDING', 'COMPLETED', 'FAILED', 'CANCELLED']
          },
          description: 'Filter by status'
        },
        {
          name: 'type',
          in: 'query',
          schema: {
            type: 'string',
            enum: ['TRANSFER', 'EXCHANGE', 'PAYMENT', 'P2P', 'REMITTANCE']
          },
          description: 'Filter by transaction type'
        }
      ],
      responses: {
        200: {
          description: 'Transactions retrieved successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  transactions: {
                    type: 'array',
                    items: {
                      $ref: '#/components/schemas/Transaction'
                    }
                  },
                  pagination: {
                    type: 'object',
                    properties: {
                      page: {
                        type: 'integer'
                      },
                      limit: {
                        type: 'integer'
                      },
                      total: {
                        type: 'integer'
                      },
                      pages: {
                        type: 'integer'
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    post: {
      tags: ['Transactions'],
      summary: 'Create new transaction',
      description: 'Execute a new transaction between accounts',
      security: [
        {
          bearerAuth: [],
          tenantAuth: []
        }
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['fromAccountId', 'toAccountId', 'amount', 'currency'],
              properties: {
                fromAccountId: {
                  type: 'string',
                  description: 'Source account ID'
                },
                toAccountId: {
                  type: 'string',
                  description: 'Destination account ID'
                },
                amount: {
                  type: 'number',
                  minimum: 0.01,
                  description: 'Transaction amount'
                },
                currency: {
                  type: 'string',
                  description: 'Transaction currency'
                },
                transactionType: {
                  type: 'string',
                  enum: ['TRANSFER', 'EXCHANGE', 'PAYMENT', 'P2P', 'REMITTANCE'],
                  default: 'TRANSFER'
                },
                description: {
                  type: 'string',
                  description: 'Transaction description'
                }
              }
            }
          }
        }
      },
      responses: {
        201: {
          description: 'Transaction created successfully',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Transaction'
              }
            }
          }
        },
        400: {
          description: 'Validation error or insufficient balance',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              }
            }
          }
        },
        403: {
          description: 'Access denied',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              }
            }
          }
        }
      }
    }
  },
  '/transactions/{id}': {
    get: {
      tags: ['Transactions'],
      summary: 'Get transaction details',
      description: 'Retrieve detailed information about a specific transaction',
      security: [
        {
          bearerAuth: [],
          tenantAuth: []
        }
      ],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: {
            type: 'string'
          },
          description: 'Transaction ID'
        }
      ],
      responses: {
        200: {
          description: 'Transaction details retrieved successfully',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Transaction'
              }
            }
          }
        },
        404: {
          description: 'Transaction not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              }
            }
          }
        }
      }
    }
  }
};

/**
 * Swagger documentation for P2P endpoints
 */
const p2pDocs = {
  '/p2p/announcements': {
    get: {
      tags: ['P2P Trading'],
      summary: 'Get P2P announcements',
      description: 'Retrieve list of P2P trading announcements',
      security: [
        {
          bearerAuth: [],
          tenantAuth: []
        }
      ],
      parameters: [
        {
          name: 'fromCurrency',
          in: 'query',
          schema: {
            type: 'string'
          },
          description: 'Filter by source currency'
        },
        {
          name: 'toCurrency',
          in: 'query',
          schema: {
            type: 'string'
          },
          description: 'Filter by destination currency'
        },
        {
          name: 'status',
          in: 'query',
          schema: {
            type: 'string',
            enum: ['ACTIVE', 'INACTIVE', 'COMPLETED', 'CANCELLED']
          },
          description: 'Filter by status'
        },
        {
          name: 'location',
          in: 'query',
          schema: {
            type: 'string'
          },
          description: 'Filter by location'
        }
      ],
      responses: {
        200: {
          description: 'P2P announcements retrieved successfully',
          content: {
            'application/json': {
              schema: {
                type: 'array',
                items: {
                  $ref: '#/components/schemas/P2PAnnouncement'
                }
              }
            }
          }
        }
      }
    },
    post: {
      tags: ['P2P Trading'],
      summary: 'Create P2P announcement',
      description: 'Create a new P2P trading announcement',
      security: [
        {
          bearerAuth: [],
          tenantAuth: []
        }
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['fromCurrency', 'toCurrency', 'rate', 'minAmount', 'maxAmount'],
              properties: {
                fromCurrency: {
                  type: 'string',
                  description: 'Source currency'
                },
                toCurrency: {
                  type: 'string',
                  description: 'Destination currency'
                },
                rate: {
                  type: 'number',
                  minimum: 0.0001,
                  description: 'Exchange rate'
                },
                minAmount: {
                  type: 'number',
                  minimum: 0.01,
                  description: 'Minimum trade amount'
                },
                maxAmount: {
                  type: 'number',
                  minimum: 0.01,
                  description: 'Maximum trade amount'
                },
                location: {
                  type: 'string',
                  description: 'Trade location'
                },
                paymentMethods: {
                  type: 'array',
                  items: {
                    type: 'string'
                  },
                  description: 'Accepted payment methods'
                },
                description: {
                  type: 'string',
                  description: 'Announcement description'
                }
              }
            }
          }
        }
      },
      responses: {
        201: {
          description: 'P2P announcement created successfully',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/P2PAnnouncement'
              }
            }
          }
        },
        400: {
          description: 'Validation error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              }
            }
          }
        }
      }
    }
  },
  '/p2p/announcements/{id}/payment-proof': {
    post: {
      tags: ['P2P Trading'],
      summary: 'Upload payment proof',
      description: 'Upload payment proof for P2P transaction',
      security: [
        {
          bearerAuth: [],
          tenantAuth: []
        }
      ],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: {
            type: 'string'
          },
          description: 'P2P announcement ID'
        }
      ],
      requestBody: {
        required: true,
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              required: ['paymentProof'],
              properties: {
                paymentProof: {
                  type: 'string',
                  format: 'binary',
                  description: 'Payment proof file (image/pdf)'
                },
                description: {
                  type: 'string',
                  description: 'Payment description'
                }
              }
            }
          }
        }
      },
      responses: {
        200: {
          description: 'Payment proof uploaded successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  message: {
                    type: 'string'
                  },
                  proofId: {
                    type: 'string'
                  }
                }
              }
            }
          }
        },
        400: {
          description: 'Invalid file or validation error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              }
            }
          }
        },
        403: {
          description: 'Access denied',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              }
            }
          }
        }
      }
    }
  }
};

/**
 * Swagger documentation for account endpoints
 */
const accountDocs = {
  '/accounts': {
    get: {
      tags: ['Accounts'],
      summary: 'Get user accounts',
      description: 'Retrieve list of user accounts',
      security: [
        {
          bearerAuth: [],
          tenantAuth: []
        }
      ],
      parameters: [
        {
          name: 'accountType',
          in: 'query',
          schema: {
            type: 'string',
            enum: ['CHECKING', 'SAVINGS', 'TRADING', 'ESCROW']
          },
          description: 'Filter by account type'
        },
        {
          name: 'currency',
          in: 'query',
          schema: {
            type: 'string'
          },
          description: 'Filter by currency'
        },
        {
          name: 'status',
          in: 'query',
          schema: {
            type: 'string',
            enum: ['ACTIVE', 'SUSPENDED', 'CLOSED']
          },
          description: 'Filter by status'
        }
      ],
      responses: {
        200: {
          description: 'Accounts retrieved successfully',
          content: {
            'application/json': {
              schema: {
                type: 'array',
                items: {
                  $ref: '#/components/schemas/Account'
                }
              }
            }
          }
        }
      }
    },
    post: {
      tags: ['Accounts'],
      summary: 'Create new account',
      description: 'Create a new account for the user',
      security: [
        {
          bearerAuth: [],
          tenantAuth: []
        }
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['accountType', 'currency'],
              properties: {
                accountType: {
                  type: 'string',
                  enum: ['CHECKING', 'SAVINGS', 'TRADING', 'ESCROW'],
                  description: 'Account type'
                },
                currency: {
                  type: 'string',
                  description: 'Account currency'
                },
                initialBalance: {
                  type: 'number',
                  minimum: 0,
                  default: 0,
                  description: 'Initial account balance'
                }
              }
            }
          }
        }
      },
      responses: {
        201: {
          description: 'Account created successfully',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Account'
              }
            }
          }
        },
        400: {
          description: 'Validation error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              }
            }
          }
        }
      }
    }
  }
};

/**
 * Swagger documentation for user endpoints
 */
const userDocs = {
  '/users/profile': {
    get: {
      tags: ['Users'],
      summary: 'Get user profile',
      description: 'Retrieve current user profile information',
      security: [
        {
          bearerAuth: [],
          tenantAuth: []
        }
      ],
      responses: {
        200: {
          description: 'User profile retrieved successfully',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/User'
              }
            }
          }
        }
      }
    },
    put: {
      tags: ['Users'],
      summary: 'Update user profile',
      description: 'Update current user profile information',
      security: [
        {
          bearerAuth: [],
          tenantAuth: []
        }
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                firstName: {
                  type: 'string',
                  description: 'First name'
                },
                lastName: {
                  type: 'string',
                  description: 'Last name'
                },
                phone: {
                  type: 'string',
                  description: 'Phone number'
                },
                avatar: {
                  type: 'string',
                  description: 'Avatar URL'
                }
              }
            }
          }
        }
      },
      responses: {
        200: {
          description: 'User profile updated successfully',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/User'
              }
            }
          }
        },
        400: {
          description: 'Validation error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              }
            }
          }
        }
      }
    }
  }
};

// Generate swagger specification
const specs = swaggerJsdoc(swaggerOptions);

// Add custom documentation
specs.paths = {
  ...specs.paths,
  ...authDocs,
  ...transactionDocs,
  ...p2pDocs,
  ...accountDocs,
  ...userDocs
};

module.exports = {
  specs,
  serve: swaggerUi.serve,
  setup: swaggerUi.setup(specs, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Exchange Platform API Documentation',
    customfavIcon: '/favicon.ico',
    swaggerOptions: {
      docExpansion: 'list',
      filter: true,
      showRequestHeaders: true,
      showCommonExtensions: true
    }
  })
}; 