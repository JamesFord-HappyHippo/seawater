#!/bin/bash

# Route 53 Hosted Zone Creation Script
# Creates hosted zones for domains from Namecheap and Squarespace and outputs nameservers

echo "🚀 Route 53 Migration Script for Multi-Provider Domain Portfolio"
echo "=============================================================="

# Array of your domains from both Namecheap and Squarespace
DOMAINS=(
    # Namecheap domains
    "carefamilys.com"
    "equilateral.ai"
    "flux-systems.info"
    "happyhippo.ai"
    "honeydolist.vip"
    # Squarespace domains (formerly Google Domains)
    "dingsdarlings.com"
    "jimford.org" 
    "pariedolia.rocks"
    "seawater.io"
)

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}Creating hosted zones for ${#DOMAINS[@]} domains across providers...${NC}\n"

# Create output file for nameserver information
NAMESERVER_FILE="nameservers_for_domain_providers.txt"
echo "# Route 53 Nameservers for Domain Provider Updates" > $NAMESERVER_FILE
echo "# Generated on: $(date)" >> $NAMESERVER_FILE
echo "# Update these in each domain's management panel:" >> $NAMESERVER_FILE
echo "#   - Namecheap: Domain List > Manage > Domain tab > Nameservers" >> $NAMESERVER_FILE
echo "#   - Squarespace: Domains > [domain] > DNS > Name Servers" >> $NAMESERVER_FILE
echo "" >> $NAMESERVER_FILE

# Track results
SUCCESS_COUNT=0
TOTAL_COST=0

for DOMAIN in "${DOMAINS[@]}"; do
    echo -e "${YELLOW}Processing: $DOMAIN${NC}"
    
    # Check if hosted zone already exists
    EXISTING_ZONE=$(aws route53 list-hosted-zones-by-name --dns-name "$DOMAIN" --query "HostedZones[?Name=='$DOMAIN.'].Id" --output text)
    
    if [[ ! -z "$EXISTING_ZONE" ]]; then
        echo -e "${BLUE}  ℹ️  Hosted zone already exists for $DOMAIN${NC}"
        ZONE_ID=$EXISTING_ZONE
    else
        # Create hosted zone
        echo -e "  🔄 Creating hosted zone..."
        RESULT=$(aws route53 create-hosted-zone \
            --name "$DOMAIN" \
            --caller-reference "migration-$(date +%s)-$DOMAIN" \
            --hosted-zone-config Comment="Migrated from Namecheap on $(date)" \
            --output json)
        
        if [[ $? -eq 0 ]]; then
            ZONE_ID=$(echo "$RESULT" | jq -r '.HostedZone.Id')
            echo -e "${GREEN}  ✅ Created hosted zone: $ZONE_ID${NC}"
        else
            echo -e "${RED}  ❌ Failed to create hosted zone for $DOMAIN${NC}"
            continue
        fi
    fi
    
    # Get nameservers
    NAMESERVERS=$(aws route53 get-hosted-zone --id "$ZONE_ID" --query 'DelegationSet.NameServers' --output text)
    
    if [[ ! -z "$NAMESERVERS" ]]; then
        echo -e "${GREEN}  📋 Nameservers retrieved${NC}"
        
        # Add to file
        echo "## $DOMAIN" >> $NAMESERVER_FILE
        echo "Zone ID: $ZONE_ID" >> $NAMESERVER_FILE
        for NS in $NAMESERVERS; do
            echo "  $NS" >> $NAMESERVER_FILE
        done
        echo "" >> $NAMESERVER_FILE
        
        # Display on screen
        echo -e "  ${BLUE}Nameservers:${NC}"
        for NS in $NAMESERVERS; do
            echo -e "    • $NS"
        done
        
        SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
        TOTAL_COST=$(echo "$TOTAL_COST + 0.50" | bc -l)
    else
        echo -e "${RED}  ❌ Failed to retrieve nameservers${NC}"
    fi
    
    echo ""
done

# Summary
echo -e "${BLUE}=================================================="
echo -e "📊 MIGRATION SUMMARY"
echo -e "==================================================${NC}"
echo -e "${GREEN}✅ Successfully created: $SUCCESS_COUNT/${#DOMAINS[@]} hosted zones${NC}"
echo -e "${BLUE}💰 Estimated monthly cost: \$$(printf "%.2f" $TOTAL_COST)${NC}"
echo -e "${YELLOW}📄 Nameserver details saved to: $NAMESERVER_FILE${NC}"

# Display next steps
echo -e "\n${BLUE}🔄 NEXT STEPS:${NC}"
echo -e "1. ${YELLOW}Review the nameserver file:${NC} cat $NAMESERVER_FILE"
echo -e "2. ${YELLOW}Copy DNS records from providers to Route 53${NC} (we'll create a script for this)"
echo -e "3. ${YELLOW}Update nameservers:${NC}"
echo -e "   • ${BLUE}Namecheap:${NC} Domain List > Manage > Domain tab > Nameservers > Custom DNS"
echo -e "   • ${BLUE}Squarespace:${NC} Domains > [domain] > DNS > Name Servers > Use custom name servers"
echo -e "4. ${YELLOW}Wait for DNS propagation${NC} (15 minutes - 48 hours)"
echo -e "5. ${YELLOW}Cancel premium DNS services${NC} at both providers"

# Create quick reference for CloudFront integration
echo -e "\n${BLUE}🚀 For flux-systems.info CloudFront integration:${NC}"
FLUX_ZONE_ID=$(aws route53 list-hosted-zones-by-name --dns-name "flux-systems.info" --query "HostedZones[?Name=='flux-systems.info.'].Id" --output text)
if [[ ! -z "$FLUX_ZONE_ID" ]]; then
    echo -e "Zone ID: ${GREEN}$FLUX_ZONE_ID${NC}"
    echo -e "After DNS migration, you can:"
    echo -e "  • Request ACM certificate (auto-validation)"
    echo -e "  • Add CloudFront alternate domain"
    echo -e "  • Create Route 53 alias record to CloudFront"
fi

echo -e "\n${GREEN}🎉 Route 53 hosted zones are ready!${NC}"

# Offer to create DNS import script
echo -e "\n${YELLOW}Would you like me to create a script to help copy your existing DNS records? (y/n)${NC}"