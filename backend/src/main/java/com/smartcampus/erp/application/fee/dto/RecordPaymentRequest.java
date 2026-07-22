package com.smartcampus.erp.application.fee.dto;

import java.time.LocalDate;
import java.util.UUID;

import com.smartcampus.erp.domain.shared.enums.PaymentMode;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class RecordPaymentRequest {
    @NotNull          private UUID        studentFeeRecordId;
    @Min(1)           private double      amount;
    @NotNull          private LocalDate   paymentDate;
    @NotNull          private PaymentMode paymentMode;
                      private String      transactionId;
                      private String      remarks;
}