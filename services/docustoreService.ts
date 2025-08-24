// Docustore Service for XION blockchain integration
import {
  useAbstraxionAccount,
  useAbstraxionSigningClient,
  useAbstraxionClient,
} from '@burnt-labs/abstraxion-react-native';

export interface DocustoreDocument {
  id: string;
  data: any;
  owner: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DocustoreQuery {
  owner?: string;
  limit?: number;
  offset?: number;
}

export class DocustoreService {
  private signingClient: any;
  private queryClient: any;
  private account: any;

  constructor(signingClient: any, queryClient: any, account: any) {
    this.signingClient = signingClient;
    this.queryClient = queryClient;
    this.account = account;
  }

  // CREATE - Store document in docustore
  async storeDocument(data: any): Promise<string> {
    if (!this.signingClient || !this.account?.bech32Address) {
      throw new Error('Wallet not connected');
    }

    try {
      const msg = {
        typeUrl: '/docustore.v1.MsgStoreDocument',
        value: {
          creator: this.account.bech32Address,
          data: JSON.stringify(data),
        },
      };

      const fee = {
        amount: [{ denom: 'uxion', amount: '1000' }],
        gas: '200000',
      };

      const result = await this.signingClient.signAndBroadcast(
        this.account.bech32Address,
        [msg],
        fee,
        'Store document in Tendly'
      );

      if (result.code !== 0) {
        throw new Error(`Transaction failed: ${result.rawLog}`);
      }

      // Extract document ID from transaction result
      const documentId = this.extractDocumentId(result);
      return documentId;
    } catch (error) {
      console.error('Failed to store document:', error);
      throw error;
    }
  }

  // READ - Query documents from docustore
  async queryDocuments(query: DocustoreQuery = {}): Promise<DocustoreDocument[]> {
    if (!this.queryClient) {
      throw new Error('Query client not available');
    }

    try {
      const queryMsg = {
        documents: {
          owner: query.owner || this.account?.bech32Address,
          limit: query.limit || 100,
          offset: query.offset || 0,
        },
      };

      const result = await this.queryClient.queryContractSmart(
        process.env.EXPO_PUBLIC_DOCUSTORE_CONTRACT_ADDRESS,
        queryMsg
      );

      return result.documents.map((doc: any) => ({
        id: doc.id,
        data: JSON.parse(doc.data),
        owner: doc.owner,
        createdAt: new Date(doc.created_at),
        updatedAt: new Date(doc.updated_at),
      }));
    } catch (error) {
      console.error('Failed to query documents:', error);
      throw error;
    }
  }

  // READ - Get specific document by ID
  async getDocument(documentId: string): Promise<DocustoreDocument | null> {
    if (!this.queryClient) {
      throw new Error('Query client not available');
    }

    try {
      const queryMsg = {
        document: {
          id: documentId,
        },
      };

      const result = await this.queryClient.queryContractSmart(
        process.env.EXPO_PUBLIC_DOCUSTORE_CONTRACT_ADDRESS,
        queryMsg
      );

      if (!result.document) {
        return null;
      }

      return {
        id: result.document.id,
        data: JSON.parse(result.document.data),
        owner: result.document.owner,
        createdAt: new Date(result.document.created_at),
        updatedAt: new Date(result.document.updated_at),
      };
    } catch (error) {
      console.error('Failed to get document:', error);
      return null;
    }
  }

  // UPDATE - Update existing document
  async updateDocument(documentId: string, data: any): Promise<void> {
    if (!this.signingClient || !this.account?.bech32Address) {
      throw new Error('Wallet not connected');
    }

    try {
      const msg = {
        typeUrl: '/docustore.v1.MsgUpdateDocument',
        value: {
          creator: this.account.bech32Address,
          id: documentId,
          data: JSON.stringify(data),
        },
      };

      const fee = {
        amount: [{ denom: 'uxion', amount: '1000' }],
        gas: '200000',
      };

      const result = await this.signingClient.signAndBroadcast(
        this.account.bech32Address,
        [msg],
        fee,
        'Update document in Tendly'
      );

      if (result.code !== 0) {
        throw new Error(`Transaction failed: ${result.rawLog}`);
      }
    } catch (error) {
      console.error('Failed to update document:', error);
      throw error;
    }
  }

  // DELETE - Delete document from docustore
  async deleteDocument(documentId: string): Promise<void> {
    if (!this.signingClient || !this.account?.bech32Address) {
      throw new Error('Wallet not connected');
    }

    try {
      const msg = {
        typeUrl: '/docustore.v1.MsgDeleteDocument',
        value: {
          creator: this.account.bech32Address,
          id: documentId,
        },
      };

      const fee = {
        amount: [{ denom: 'uxion', amount: '1000' }],
        gas: '200000',
      };

      const result = await this.signingClient.signAndBroadcast(
        this.account.bech32Address,
        [msg],
        fee,
        'Delete document from Tendly'
      );

      if (result.code !== 0) {
        throw new Error(`Transaction failed: ${result.rawLog}`);
      }
    } catch (error) {
      console.error('Failed to delete document:', error);
      throw error;
    }
  }

  private extractDocumentId(result: any): string {
    // Extract document ID from transaction events
    const events = result.events || [];
    for (const event of events) {
      if (event.type === 'docustore.document_stored') {
        const idAttr = event.attributes.find((attr: any) => attr.key === 'id');
        if (idAttr) {
          return idAttr.value;
        }
      }
    }
    
    // Fallback: generate ID from transaction hash
    return `doc_${result.transactionHash}_${Date.now()}`;
  }
}

// Hook to use docustore service
export function useDocustore() {
  const { data: account, isConnected } = useAbstraxionAccount();
  const { client: signingClient } = useAbstraxionSigningClient();
  const { client: queryClient } = useAbstraxionClient();

  const docustoreService = new DocustoreService(
    signingClient,
    queryClient,
    account
  );

  return {
    docustoreService,
    isConnected,
    account,
  };
}