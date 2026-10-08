import type { CollectionConfig } from 'payload'
import { allow, ROLES } from '@/access'
export const CasinoRounds: CollectionConfig = {
  slug:'casino-rounds', labels:{singular:'Casino Round',plural:'Casino Rounds'},
  admin:{group:'Games',defaultColumns:['id','game','user','status','betAmount','payoutAmount','createdAt']},
  access:{read:allow(...ROLES.operationsRead),create:()=>false,update:()=>false,delete:()=>false},
  fields:[
    {name:'game',type:'select',required:true,index:true,options:[{label:'Mine',value:'MINE'},{label:'Video Poker',value:'POKER'},{label:'Crash',value:'CRASH'},{label:'Slide',value:'SLIDE'}]},
    {name:'user',type:'relationship',relationTo:'users',required:true,index:true},
    {name:'status',type:'select',required:true,index:true,options:[{label:'Active',value:'ACTIVE'},{label:'Won',value:'WON'},{label:'Lost',value:'LOST'},{label:'Cashed out',value:'CASHED_OUT'},{label:'Refunded',value:'REFUNDED'}]},
    {name:'betAmount',type:'number',required:true},{name:'payoutAmount',type:'number',defaultValue:0},{name:'currency',type:'text',required:true,defaultValue:'INR'},
    {name:'state',type:'json',required:true},{name:'startedAt',type:'date',required:true},{name:'settledAt',type:'date'},
  ],
}
