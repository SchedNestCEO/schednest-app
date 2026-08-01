export type GraphEntity = {
  id: string;
  product: string;
  entity_type: string;
  title: string;
  confidence: number | null;
  updated_at: string;
};

export type GraphRelationship = {
  id: string;
  relationship_type: string;
  confidence: number | null;
};

export type GraphEvidence = {
  id: string;
  evidence_type: string;
};

export type ConfidenceAssessment = {
  id: string;
  overall_confidence: number;
};

export type BirdyGraphResponse = {
  entities: GraphEntity[];
  relationships: GraphRelationship[];
  evidence: GraphEvidence[];
  confidenceAssessments: ConfidenceAssessment[];
  summary: {
    entityCount: number;
    relationshipCount: number;
    evidenceCount: number;
    averageConfidence: number;
  };
};
